const Twit = require('twit');
const sentiment = require('sentiment');

const config = {
  twitter: {
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
  },
  delaySeconds: process.env.DELAY_SEC || 3600,
  enabled: true,
};

const T = new Twit(config.twitter);

let lastUpdate = new Date();

function shouldReply(tweet) {
  return (
    tweet.text.toLowerCase().startsWith('fun fact:') &&
    !tweet.is_quote_status
  )
}

function funRating(tweet) {
  // Sentiment normalized per word (theoretical range +/- 5 but more typically +/- 0.5)
  const tweetSentiment = sentiment(tweet.text).comparative;

  // Logistic function to scale 0-1 with a hopefully more linear distribution
  const rating = 1/(1+Math.exp(-4*tweetSentiment));

  console.log(`score: ${tweetSentiment}, scaled: ${rating}`);
  return rating;
}

function replyTo(tweet) {
  const now = new Date()
  if (now - lastUpdate < config.delaySeconds * 1000) {
    console.log("trying to reply too soon")   // TODO: query last tweet sent instead
    return;
  }

  const rating = funRating(tweet) * 100

  const permalink = `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`;
  const text = `This fact is ${rating.toFixed(1)}% fun ${permalink}`;

  lastUpdate = now;

  console.log("Sending tweet: " + text)

  T.post('statuses/update', { status: text }, function(err, data, response) {
    if (err) {
      console.log(err);
    } else {
      console.log("...Sent!")
    }
  })
}

function attemptUpdate() {
  const query = {
    q: '"fun fact"',
    lang: 'en',
    result_type: 'recent',
  }

  T.get('search/tweets', query, function(err, data, response) {
    if (err) {
      console.log('error searching for tweets: ', err);
    } else {
      for (let tweet of data.statuses) {
        if (shouldReply(tweet)) {
          const replyDelay = 3*60;
          console.log("Scheduling reply to ", tweet.text);
          setTimeout(replyTo, replyDelay, tweet);
          break;
        }
      }
    }
    setTimeout(attemptUpdate, config.delaySeconds*1000);
  })
}


if (config.enabled) {
  console.log(`Starting bot with delay ${config.delaySeconds} seconds`);
  setTimeout(attemptUpdate, config.delaySeconds*1000);
} else {
  console.log("Disabled, shutting down")
}


