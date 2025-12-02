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
#define WIFI_SSID "Freebox-25AF0D"       
#define WIFI_PASSWORD "6n7xxq55b2q7hhzfq3kh7t"  

#define API_KEY "AIzaSyD_G_PAGyTb7nsxjOBHm8clKobSCrdSn3M"
#define DATABASE_URL "https://mimo-97d25-default-rtdb.europe-west1.firebasedatabase.app/" 

static BLEUUID serviceUUID("180A");
static BLEUUID charUUID("2A6F");
const int SEUIL_ALERTE_SONORE = 500; 
// ==================================================

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// --- LA LIGNE QUI MANQUAIT EST ICI : ---
unsigned long sendDataPrevMillis = 0;
// ---------------------------------------

// Variables "Volatiles" pour l'échange de données entre BLE et Loop
volatile bool newDataReceived = false;
volatile uint32_t soundValueToProcess = 0;

BLEClient* pClient  = NULL;
BLERemoteCharacteristic* pRemoteCharacteristic;
bool doConnect = false;
bool connected = false;
BLEAdvertisedDevice* myDevice;

// --- CALLBACK BLE (Doit être ULTRA RAPIDE) ---
static void notifyCallback(BLERemoteCharacteristic* pBLERemoteCharacteristic, uint8_t* pData, size_t length, bool isNotify) {
    uint32_t val = 0;
    if (length >= 4) {
        memcpy(&val, pData, 4);
    } else if (length > 0) {
        val = pData[0]; 
    }
    
    // On met la valeur dans la "boîte aux lettres"
    soundValueToProcess = val;
    newDataReceived = true; // On lève le drapeau
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
    WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Anti-Brownout
    
    Serial.begin(115200); 
    delay(1000);
    Serial.println("\n--- DEMARRAGE GATEWAY ROBUSTE ---");

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
    
    // Authentification Anonyme
    if (Firebase.signUp(&config, &auth, "", "")){
        Serial.println("Firebase Auth OK");
    } else {
        Serial.printf("Erreur Auth: %s\n", config.signer.signupError.message.c_str());
    }
    
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);

    // Augmente la mémoire tampon pour le SSL (évite erreur "ssl engine closed")
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

    pRemoteCharacteristic = pRemoteService->getCharacteristic(charUUID);
    if (pRemoteCharacteristic == nullptr) return false;

    if(pRemoteCharacteristic->canNotify()) {
        pRemoteCharacteristic->registerForNotify(notifyCallback);
    }
    connected = true;
    return true;
}

void loop() {
    // 1. Gestion de la connexion BLE initiale
    if (doConnect == true) {
        if (connectToServer()) {
            Serial.println("Prêt à recevoir !");
        } else {
            Serial.println("Échec connexion BLE.");
        }
        doConnect = false;
    }

    // 2. MISE A JOUR DE LA VALEUR LOCALE (Ultra rapide)
    if (newDataReceived) {
        newDataReceived = false; 
    }

    // 3. ENVOI A FIREBASE (Lent - Seulement toutes les 2 secondes)
    if (Firebase.ready() && (millis() - sendDataPrevMillis > 2000)) {
        sendDataPrevMillis = millis(); // On remet le chrono à zéro

        uint32_t currentValue = soundValueToProcess;
        
        Serial.print("Envoi Firebase (Valeur: ");
        Serial.print(currentValue);
        Serial.print(")... ");

        if (Firebase.RTDB.setInt(&fbdo, "/maison/salon/niveau_sonore", currentValue)) {
            Serial.println("OK !");
            
            if (currentValue > SEUIL_ALERTE_SONORE) {
                 Firebase.RTDB.setBool(&fbdo, "/maison/salon/alerte", true);
            } else { 
                 Firebase.RTDB.setBool(&fbdo, "/maison/salon/alerte", false);
            }

        } else {
            Serial.print("ERREUR: ");
            Serial.println(fbdo.errorReason());
        }
    }
    
    delay(10);
}