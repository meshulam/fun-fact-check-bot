sudo docker build -t factbot .
sudo docker run -d --restart=on-failure:10 --env-file .env factbot
