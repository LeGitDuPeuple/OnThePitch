# Jenkins de DÉMONSTRATION / de validation du Jenkinsfile, prêt à l'emploi.
# Définit aussi l'environnement de test de la CI (voir docs/tests.md) : tout ce
# que le pipeline suppose de l'agent est installé ici, en un seul endroit.
#
# Construit et lancé par scripts/jenkins-local.sh (jamais en production : mot de
# passe administrateur de démonstration, dépôt monté depuis le poste).
FROM jenkins/jenkins:lts-jdk21

USER root

# Outils exigés par les scripts : Git (checkout), curl et openssl (smoke-test,
# secrets aléatoires), Node.js 24 (LTS du projet), client Docker + plugin
# Compose (pilotent le Docker de l'HÔTE via sa socket : les conteneurs de test
# sont des "frères" de Jenkins, pas des conteneurs imbriqués), Google Chrome
# (les E2E utilisent "channel: chrome").
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg openssl rsync \
  && install -m 0755 -d /etc/apt/keyrings \
  && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
      > /etc/apt/sources.list.d/docker.list \
  && curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /etc/apt/keyrings/google.gpg \
  && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
      > /etc/apt/sources.list.d/google-chrome.list \
  && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
  && apt-get install -y --no-install-recommends \
      nodejs docker-ce-cli docker-compose-plugin google-chrome-stable \
  && rm -rf /var/lib/apt/lists/* \
  # Le dépôt est monté depuis l'hôte (autre propriétaire) : Git refuserait de le lire.
  && git config --system --add safe.directory '*'

USER jenkins

# Plugins figés dans l'image (pas d'installation par l'interface au premier lancement).
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# Pas d'assistant de configuration : tout vient de casc.yaml (Configuration as Code).
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
ENV CASC_JENKINS_CONFIG=/usr/share/jenkins/casc.yaml
COPY casc.yaml /usr/share/jenkins/casc.yaml
