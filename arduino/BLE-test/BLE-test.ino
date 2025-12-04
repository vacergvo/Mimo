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
//#define WIFI_SSID "Freebox-25AF0D"       
//#define WIFI_PASSWORD "6n7xxq55b2q7hhzfq3kh7t"  
#define WIFI_SSID "abyss"       
#define WIFI_PASSWORD "dhbf9600" 

#define API_KEY "AIzaSyD_G_PAGyTb7nsxjOBHm8clKobSCrdSn3M"
#define DATABASE_URL "https://mimo-97d25-default-rtdb.europe-west1.firebasedatabase.app/" 

// UUIDs
static BLEUUID serviceUUID("180A");
static BLEUUID charUUID_1("2A6F"); // Capteur 1 (Original)
static BLEUUID charUUID_2("2A6E"); // Capteur 2 (Nouveau)

const int SEUIL_ALERTE_SONORE = 500; 
// ==================================================

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long sendDataPrevMillis = 0;

// Variables volatiles pour stocker les 2 valeurs
volatile bool newDataReceived = false;
volatile uint32_t valSensor1 = 0;
volatile uint32_t valSensor2 = 0;

BLEClient* pClient  = NULL;
BLERemoteCharacteristic* pChar1;
BLERemoteCharacteristic* pChar2;
bool doConnect = false;
bool connected = false;
BLEAdvertisedDevice* myDevice;

// --- CALLBACK BLE (Commun aux deux capteurs) ---
static void notifyCallback(BLERemoteCharacteristic* pBLERemoteCharacteristic, uint8_t* pData, size_t length, bool isNotify) {
    uint32_t val = 0;
    if (length >= 4) {
        memcpy(&val, pData, 4);
    } else if (length > 0) {
        val = pData[0]; 
    }

    // On vérifie QUEL capteur a envoyé la donnée en comparant les UUIDs
    if (pBLERemoteCharacteristic->getUUID().equals(charUUID_1)) {
        valSensor1 = val;
    } else if (pBLERemoteCharacteristic->getUUID().equals(charUUID_2)) {
        valSensor2 = val;
    }
    
    newDataReceived = true; 
}

class MyAdvertisedDeviceCallbacks: public BLEAdvertisedDeviceCallbacks {
    void onResult(BLEAdvertisedDevice advertisedDevice) {
        if (advertisedDevice.haveServiceUUID() && advertisedDevice.isAdvertisingService(serviceUUID)) {
            Serial.print("Nano trouvée ! RSSI: ");
            Serial.println(advertisedDevice.getRSSI());
            BLEDevice::getScan()->stop(); 
            myDevice = new BLEAdvertisedDevice(advertisedDevice);
            doConnect = true; 
        }
    }
};

void setup() {
    WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); 
    
    Serial.begin(115200); 
    delay(1000);
    Serial.println("\n--- DEMARRAGE GATEWAY (DUAL SENSOR) ---");

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Connexion Wi-Fi");
    while (WiFi.status() != WL_CONNECTED) {
        Serial.print(".");
        delay(500);
    }
    Serial.println("\nWi-Fi Connecté !");

    config.api_key = API_KEY;
    config.database_url = DATABASE_URL;
    
    if (Firebase.signUp(&config, &auth, "", "")){
        Serial.println("Firebase Auth OK");
    } else {
        Serial.printf("Erreur Auth: %s\n", config.signer.signupError.message.c_str());
    }
    
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
    fbdo.setBSSLBufferSize(4096, 1024);

    BLEDevice::init("");
    BLEScan* pBLEScan = BLEDevice::getScan();
    pBLEScan->setAdvertisedDeviceCallbacks(new MyAdvertisedDeviceCallbacks());
    pBLEScan->setInterval(1349);
    pBLEScan->setWindow(449);
    pBLEScan->setActiveScan(true);
    pBLEScan->start(10, false); 
    Serial.println("Scan BLE lancé...");
}

bool connectToServer() {
    Serial.print("Connexion BLE...");
    pClient = BLEDevice::createClient();
    pClient->connect(myDevice);
    Serial.println("OK");

    BLERemoteService* pRemoteService = pClient->getService(serviceUUID);
    if (pRemoteService == nullptr) return false;

    // --- Connexion Caractéristique 1 ---
    pChar1 = pRemoteService->getCharacteristic(charUUID_1);
    if (pChar1 != nullptr && pChar1->canNotify()) {
        pChar1->registerForNotify(notifyCallback);
    }

    // --- Connexion Caractéristique 2 ---
    pChar2 = pRemoteService->getCharacteristic(charUUID_2);
    if (pChar2 != nullptr && pChar2->canNotify()) {
        pChar2->registerForNotify(notifyCallback);
    }

    connected = true;
    return true;
}

void loop() {
    if (doConnect == true) {
        if (connectToServer()) {
            Serial.println("Prêt à recevoir les 2 capteurs !");
        } else {
            Serial.println("Échec connexion BLE.");
        }
        doConnect = false;
    }

    if (newDataReceived) {
        newDataReceived = false; 
    }

    // ENVOI FIREBASE (Toutes les 2 secondes)
    if (Firebase.ready() && (millis() - sendDataPrevMillis > 2000)) {
        sendDataPrevMillis = millis(); 

        uint32_t v1 = valSensor1;
        uint32_t v2 = valSensor2;
        
        Serial.print("Envoi Firebase [C1: ");
        Serial.print(v1);
        Serial.print(" | C2: ");
        Serial.print(v2);
        Serial.print("]... ");

        // Envoi Capteur 1
        Firebase.RTDB.setInt(&fbdo, "/maison/salon/capteur_1", v1);
        
        // Envoi Capteur 2
        Firebase.RTDB.setInt(&fbdo, "/maison/salon/capteur_2", v2);

        Serial.println("OK !");

        // Gestion Alerte (Si L'UN DES DEUX dépasse le seuil)
        if (v1 > SEUIL_ALERTE_SONORE || v2 > SEUIL_ALERTE_SONORE) {
             Firebase.RTDB.setBool(&fbdo, "/maison/salon/alerte", true);
        } else {
             Firebase.RTDB.setBool(&fbdo, "/maison/salon/alerte", false);
        }
    }
    
    delay(10);
}