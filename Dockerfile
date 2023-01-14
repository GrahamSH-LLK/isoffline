FROM node:lts-bullseye-slim
WORKDIR /usr/app
COPY package.json .
RUN npm install --quiet
COPY . .