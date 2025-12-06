#include <ArduinoBLE.h>

const int pinSensor1 = A0;
const int pinSensor2 = A1;

// Un faux ID de "Fabricant" pour reconnaître nos capteurs
// On utilise 0xFFFF qui est réservé aux tests
const int MANUFACTURER_ID = 0xFFFF; 

void setup() {
  Serial.begin(9600);
  
  // Si le BLE ne démarre pas, on bloque
  if (!BLE.begin()) {
    while (1);
  }

  // Configuration du nom
  BLE.setLocalName("NanoSon"); 
  
  // On prépare le tableau de données (4 octets : 2 pour A0, 2 pour A1)
  // Car la valeur max est 1023 (ou 4095), donc ça tient sur 2 octets (uint16_t)
  byte payload[4] = {0, 0, 0, 0};

  // On initialise les données fabricant
  BLE.setManufacturerData(MANUFACTURER_ID, payload, 4);
  
  // On commence à crier
  BLE.advertise();
}

void loop() {
  // 1. On lit les capteurs
  // (Vous pouvez remettre votre logique de "Max sur 50ms" ici si vous voulez)
  int val1 = analogRead(pinSensor1);
  int val2 = analogRead(pinSensor2);

  // 2. On découpe les valeurs (int) en octets (byte)
  // val1 sur les 2 premiers octets
  byte payload[4];
  payload[0] = val1 & 0xFF;        // Partie basse
  payload[1] = (val1 >> 8) & 0xFF; // Partie haute
  
  // val2 sur les 2 suivants
  payload[2] = val2 & 0xFF;
  payload[3] = (val2 >> 8) & 0xFF;

  // 3. On met à jour le message publicitaire
  // La Nano va changer son "cri" immédiatement
  BLE.stopAdvertise(); // Nécessaire parfois pour forcer la mise à jour
  BLE.setManufacturerData(MANUFACTURER_ID, payload, 4);
  BLE.advertise();
  
  // Affichage débogage
  Serial.print("Broadcast -> C1: ");
  Serial.print(val1);
  Serial.print(" | C2: ");
  Serial.println(val2);

  delay(200); // On émet 5 fois par seconde
}