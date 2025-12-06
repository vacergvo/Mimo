#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

// --- CORRECTIF BROWNOUT ---
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ================= VOS PARAMETRES =================
#define WIFI_SSID "abyss"       
#define WIFI_PASSWORD "dhbf9600" 

#define API_KEY "AIzaSyD_G_PAGyTb7nsxjOBHm8clKobSCrdSn3M"
#define DATABASE_URL "https://mimo-97d25-default-rtdb.europe-west1.firebasedatabase.app/" 

const int SEUIL_ALERTE_SONORE = 500; 
// ==================================================

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long sendDataPrevMillis = 0;
uint32_t lastVal1 = 0;
uint32_t lastVal2 = 0;
bool newData = false;

// Callback appelé à chaque fois qu'un paquet BLE est détecté
class MyAdvertisedDeviceCallbacks: public BLEAdvertisedDeviceCallbacks {
    void onResult(BLEAdvertisedDevice advertisedDevice) {
        
        // 1. On vérifie si c'est notre Nano (Par le nom ou l'ID)
        if (advertisedDevice.getName() == "NanoSon") {
            
            // 2. On vérifie s'il y a des données "Manufacturer"
            if (advertisedDevice.haveManufacturerData()) {
                
                // On récupère la donnée brute (string)
                String data = advertisedDevice.getManufacturerData();
                
                // Les 2 premiers octets sont souvent l'ID (0xFFFF), on les saute parfois
                // Mais avec la librairie ESP32 standard, data contient tout.
                // Le format reçu est souvent : [ID_LOW] [ID_HIGH] [V1_LOW] [V1_HIGH] [V2_LOW] [V2_HIGH]
                // Note : Cela dépend des versions de librairies, il faut parfois ajuster l'index.
                
                // Si la taille est suffisante (2 bytes ID + 4 bytes Data = 6 bytes)
                if (data.length() >= 6) {
                    // Décodage Capteur 1 (Octets 2 et 3)
                    uint32_t v1 = (uint8_t)data[2] | ((uint8_t)data[3] << 8);
                    
                    // Décodage Capteur 2 (Octets 4 et 5)
                    uint32_t v2 = (uint8_t)data[4] | ((uint8_t)data[5] << 8);

                    // Mise à jour des variables globales
                    lastVal1 = v1;
                    lastVal2 = v2;
                    newData = true;
                    
                    Serial.printf("Reçu Broadcast -> C1: %d | C2: %d \n", v1, v2);
                }
            }
        }
    }
};

void setup() {
    WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); 
    Serial.begin(115200); 
    
    // Wi-Fi
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
    Serial.println("\nWi-Fi OK");

    // Firebase
    config.api_key = API_KEY;
    config.database_url = DATABASE_URL;
    Firebase.signUp(&config, &auth, "", "");
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
    fbdo.setBSSLBufferSize(4096, 1024);

    // BLE Scan (Continu)
    BLEDevice::init("");
    BLEScan* pBLEScan = BLEDevice::getScan();
    pBLEScan->setAdvertisedDeviceCallbacks(new MyAdvertisedDeviceCallbacks());
    pBLEScan->setActiveScan(true); // Scan actif pour lire les données plus vite
    pBLEScan->setInterval(100);
    pBLEScan->setWindow(99);  // Scan presque 100% du temps
}

void loop() {
    // Le scan doit tourner en permanence ou être relancé
    // La méthode start(0) scanne à l'infini
    BLEDevice::getScan()->start(1, false); // Scan 1 seconde, puis rend la main à la loop
    BLEDevice::getScan()->clearResults();   // Nettoie la mémoire pour ne pas saturer

    // Envoi Firebase (Toutes les 2 secondes max)
    if (newData && Firebase.ready() && (millis() - sendDataPrevMillis > 2000)) {
        sendDataPrevMillis = millis();
        newData = false;

        Serial.print("Firebase Update... ");
        Firebase.RTDB.setInt(&fbdo, "/maison/salon/capteur_1", lastVal1);
        Firebase.RTDB.setInt(&fbdo, "/maison/salon/capteur_2", lastVal2);
        
        if (lastVal1 > SEUIL_ALERTE_SONORE || lastVal2 > SEUIL_ALERTE_SONORE) {
             Firebase.RTDB.setBool(&fbdo, "/maison/salon/alerte", true);
        } else {
             Firebase.RTDB.setBool(&fbdo, "/maison/salon/alerte", false);
        }
        Serial.println("Done.");
    }
}