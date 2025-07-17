FROM node:24-alpine

LABEL org.opencontainers.image.source="https://github.com/6sense-Technologies/dep-shield-main-service"

WORKDIR /dep-shield-main-service

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
