# syntax=docker/dockerfile:1.7
FROM node:24.22.1-alpine3.24 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24.22.1-alpine3.24 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Les NEXT_PUBLIC_* sont figées dans le bundle client au moment du `npm run
# build` : les fournir au `docker run --env-file` est trop tard, le navigateur
# reçoit alors `undefined`. C'est ce qui donnait « NEXT_PUBLIC_API_URL n'est pas
# configurée » sur l'espace client. Toute nouvelle NEXT_PUBLIC_* doit être
# ajoutée ici, en plus de l'environnement d'exécution.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/register
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/espace-client
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/espace-client

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL

RUN npm run build

FROM node:24.22.1-alpine3.24 AS runtime
WORKDIR /app

# Racines eMudhra (emSign) retirées (compromission de l'AC, 31/10/2026). Le serveur
# filtre déjà le magasin de Node au démarrage (instrumentation.ts) ; ceci les retire
# aussi du bundle système.
RUN node <<'EOF'
const fs = require('fs');
const { X509Certificate } = require('crypto');
const file = '/etc/ssl/certs/ca-certificates.crt';
if (fs.existsSync(file)) {
  const pems = fs.readFileSync(file, 'utf8').match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? [];
  const kept = pems.filter((pem) => !/eMudhra|emSign/i.test(new X509Certificate(pem).subject));
  fs.writeFileSync(file, kept.join('\n') + '\n');
  console.log(`${file}: ${pems.length - kept.length} emSign roots removed`);
}
EOF

ENV NODE_ENV=production \
    PORT=3000

RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nodeapp:nodeapp /app/.next/standalone ./
COPY --from=builder --chown=nodeapp:nodeapp /app/.next/static ./.next/static

USER nodeapp

EXPOSE 3000

CMD ["node", "server.js"]
