# node:24-slim (Debian, pas Alpine) : bcrypt a un module natif (C++) compilé
# à l'installation — Alpine (musl) demande souvent une recompilation ou des
# paquets système en plus pour ce genre de dépendance native. Simple à éviter
# en partant d'une image Debian dès le départ. Prisma, lui, n'a pas ce
# problème ici : ce projet utilise @prisma/adapter-pg (requêtes via le driver
# pg standard), donc aucun moteur binaire Prisma à gérer.
FROM node:24-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# --- Image finale : le code compilé (dist/) plutôt que les sources
# TypeScript, mais node_modules complet — la CLI Prisma (normalement une
# dépendance de dev) reste nécessaire au démarrage pour "migrate deploy".
FROM node:24-slim
WORKDIR /app

# Recommandé par Prisma lui-même pour Docker : sans openssl, le moteur de
# migration ne détecte pas la version disponible et se rabat sur une valeur
# par défaut (avertissement au démarrage, pas bloquant, mais autant l'éviter).
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma7.config.ts ./prisma7.config.ts
COPY prisma ./prisma

EXPOSE 3000

# migrate deploy (jamais migrate dev, réservé au poste de développement) avant
# de démarrer : un environnement neuf se met à jour tout seul au premier lancement.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
