// Pipeline d'intégration continue d'OnThePitch (Jenkins, syntaxe déclarative).
// Voir docs/tests.md (procédure) et docs/deploiement.md (environnements).
//
// Ce fichier ne contient volontairement AUCUNE logique : chaque étape appelle un
// script de scripts/, que l'on peut aussi lancer et déboguer à la main sur un
// poste, sans Jenkins.
//
//   Déclencheur                      Étapes exécutées
//   ------------------------------   ------------------------------------------
//   push (interrogation du dépôt)    Vérification (≈ 1 min 30, aucune base requise)
//   chaque nuit (~ 2 h)              Vérification + Audit de sécurité + E2E (≈ 5 min)
//   lancement manuel, LANCER_E2E     idem la nuit (pour rejouer les E2E à la demande)
//
// Prérequis de l'agent : Git, Node.js 24, Docker + Docker Compose, Google Chrome,
// openssl, et les ports 3000 et 5173 libres pendant les E2E.
// (Image de démonstration prête à l'emploi : ci/jenkins/, scripts/jenkins-local.sh.)
pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
    // Les E2E occupent les ports 3000/5173 et partagent une pile Docker
    // nommée : deux exécutions en parallèle se marcheraient dessus.
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  triggers {
    // Push : interrogation du dépôt toutes les 5 minutes (le "H" répartit la
    // charge). En production, un webhook GitHub est préférable (build
    // immédiat, pas d'interrogation) mais exige un Jenkins joignable depuis
    // Internet — inutile pour une démonstration en environnement de dev.
    pollSCM('H/5 * * * *')
    // Nuit : pile complète + E2E + audit.
    cron('H 2 * * *')
  }

  parameters {
    booleanParam(
      name: 'LANCER_E2E',
      defaultValue: false,
      description: 'Lancer aussi les tests de bout en bout et l\'audit (déjà automatique la nuit).'
    )
  }

  stages {
    stage('Vérification') {
      steps {
        sh './scripts/verifier.sh'
      }
      post {
        always {
          // Résultats Jest affichés dans Jenkins (nombre, échecs, tendance).
          junit allowEmptyResults: true, testResults: 'backend/resultats/jest-junit.xml'
        }
      }
    }

    stage('Audit de sécurité') {
      when {
        anyOf {
          triggeredBy 'TimerTrigger'
          expression { params.LANCER_E2E }
        }
      }
      steps {
        // Une vulnérabilité grave rend le build INSTABLE (jaune), pas rouge :
        // l'alerte doit être vue et traitée (voir docs/veille.md) sans bloquer
        // pour autant une faille transitive qui n'a pas encore de correctif.
        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
          sh './scripts/audit.sh'
        }
      }
      post {
        always {
          archiveArtifacts artifacts: 'resultats/audit/*.txt', allowEmptyArchive: true
        }
      }
    }

    stage('Tests de bout en bout') {
      when {
        anyOf {
          triggeredBy 'TimerTrigger'
          expression { params.LANCER_E2E }
        }
      }
      steps {
        // Pile jetable (base + API + front) puis suite Playwright, nettoyée
        // dans tous les cas par le script lui-même.
        sh './scripts/e2e.sh'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'e2e/resultats/playwright-junit.xml'
          archiveArtifacts artifacts: 'e2e/playwright-report/**', allowEmptyArchive: true
        }
      }
    }
  }

  post {
    failure {
      echo 'Build en échec : voir l\'étape en rouge, et les rapports archivés (Playwright, audit).'
    }
  }
}
