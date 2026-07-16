FROM node:22-slim

# Install OpenSSL 3 (Standard for Debian Bookworm/Node 22)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Force Prisma to generate the correct debian-openssl binary
ENV PRISMA_CLI_BINARY_TARGETS="debian-openssl-3.0.x"
RUN npx prisma generate

EXPOSE 9990

CMD ["npm", "start"]