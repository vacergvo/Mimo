#include <ArduinoBLE.h>
#include <math.h>

// --- UUIDs (Doivent être identiques sur la Gateway ESP32) ---
BLEService soundService("180A"); 
BLEUnsignedIntCharacteristic soundLevelCharacteristic("2A6F", BLERead | BLENotify); 

const int soundSensorPin = A0; 

void setup() {
  // On démarre le port série pour le débogage éventuel...
  Serial.begin(9600);
  
  // ... MAIS ON NE BLOQUE PAS LE PROGRAMME !
  // La ligne "while (!Serial);" a été supprimée.
  // La carte démarrera maintenant immédiatement, branchée ou non à un PC.

  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW); 

  if (!BLE.begin()) {
    // Si le BLE échoue, on clignote vite pour signaler une erreur matérielle
    while (1) {
      digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
      delay(100);
    }
  }

  BLE.setLocalName("CapteurSonoreBLE");
  BLE.setAdvertisedService(soundService);
  soundService.addCharacteristic(soundLevelCharacteristic);
  BLE.addService(soundService);
  soundLevelCharacteristic.writeValue(0);

  BLE.advertise();
  
  // La LED s'allume fixe pour dire "Je suis prête et j'émets !"
  digitalWrite(LED_BUILTIN, HIGH); 
}

void loop() {
  BLEDevice central = BLE.central();

  if (central) {
    // Optionnel : faire clignoter la LED ou changer d'état quand connecté
    // Pour économiser la batterie, on pourrait l'éteindre, mais gardons-la allumée pour le test.

    while (central.connected()) {
      
      // --- 1. ECHANTILLONNAGE (Pour éviter les chutes parasites) ---
      int signalMax = 0;
      unsigned long startMillis = millis(); 
      unsigned long sampleWindow = 50; // Fenêtre de 50ms (suffisant pour chopper un pic de voix)

      while (millis() - startMillis < sampleWindow) {
         int sample = analogRead(soundSensorPin);
         if (sample > signalMax) {
            signalMax = sample;
         }
      }
      
      // --- 2. CONVERSION (Optionnelle, juste pour info) ---
      // Formule approximative : 20 * log10(Valeur) + Calibration
      // (Changez le +15.0 si vous voulez ajuster par rapport à un vrai sonomètre)
      float dbValue = 0;
      if (signalMax > 0) {
         dbValue = 20.0 * log10(signalMax) + 15.0;
      }

      // --- 3. ENVOI BLE ---
      // On envoie la valeur MAX trouvée (le pic)
      soundLevelCharacteristic.writeValue(signalMax);
      
      // Petit délai pour ne pas spammer la Gateway inutilement
      // La boucle d'échantillonnage prend déjà 50ms, on ajoute un peu de repos.
      delay(100); 
    }
  }
}