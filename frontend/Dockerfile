FROM node:26-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Image finale : nginx sert les fichiers statiques produits par Vite.
# Nécessaire (pas juste "plus propre") : sans la configuration de repli sur
# index.html ci-dessous, recharger une page comme /evenements/42 renverrait
# une 404 nginx — react-router gère cette route côté client, pas nginx.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
