FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl1.1-compat

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 9990

CMD ["npm", "start"]
