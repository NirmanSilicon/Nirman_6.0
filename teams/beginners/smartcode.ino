#include <WiFi.h>
#include <WebServer.h>

// =====================================
// WIFI ACCESS POINT SETTINGS
// =====================================

const char* apSSID = "SMART COMMUNICATION";
const char* apPassword = "12345678";

WebServer server(80);

// =====================================
// FLEX SENSOR PINS
// =====================================

const int flex1Pin = 34;
const int flex2Pin = 35;
const int flex3Pin = 32;

// =====================================
// FLEX SENSOR THRESHOLDS
// =====================================

// Flex 1: based on your reported readings.
// Flex 2 and Flex 3: temporary values.
// Calibrate these using actual straight and bent readings.

int threshold1 = 1850;
int threshold2 = 250;
int threshold3 = 450;

// Current circuit assumption:
// Lower ADC value = finger bent

const bool LOWER_VALUE_MEANS_BENT = true;

// =====================================
// SENSOR VARIABLES
// =====================================

int flex1Value = 0;
int flex2Value = 0;
int flex3Value = 0;

bool flex1Bent = false;
bool flex2Bent = false;
bool flex3Bent = false;

bool emergency = false;

String currentMessage = "SYSTEM READY";

// =====================================
// PATIENT LOCATION
// =====================================

const char* patientLocation =
  "Silicon University, Silicon Hills, Patia, Bhubaneswar";

const char* googleMapsURL =
  "https://www.google.com/maps/search/?api=1&query=Silicon+University+Silicon+Hills+Patia+Bhubaneswar";

// =====================================
// READ SENSOR WITH AVERAGING
// =====================================

int readFlexSensor(int pin) {
  long total = 0;

  for (int i = 0; i < 5; i++) {
    total += analogRead(pin);
    delay(5);
  }

  return total / 5;
}

// =====================================
// DETECT FINGER POSITION
// =====================================

bool isBent(int value, int threshold) {
  if (LOWER_VALUE_MEANS_BENT) {
    return value < threshold;
  } else {
    return value > threshold;
  }
}

// =====================================
// UPDATE SENSOR DATA AND MESSAGE
// =====================================

void updateSensors() {

  flex1Value = readFlexSensor(flex1Pin);
  flex2Value = readFlexSensor(flex2Pin);
  flex3Value = readFlexSensor(flex3Pin);

  flex1Bent = isBent(flex1Value, threshold1);
  flex2Bent = isBent(flex2Value, threshold2);
  flex3Bent = isBent(flex3Value, threshold3);

  // All three fingers bent: Emergency
  emergency = flex1Bent && flex2Bent && flex3Bent;

  if (emergency) {
    currentMessage = "EMERGENCY! ALL THREE FINGERS BENT!";
  }

  else if (flex1Bent && flex2Bent && !flex3Bent) {
    currentMessage = "I NEED WATER + WASHROOM";
  }

  else if (flex1Bent && !flex2Bent && flex3Bent) {
    currentMessage = "I NEED WATER + HELP";
  }

  else if (!flex1Bent && flex2Bent && flex3Bent) {
    currentMessage = "WASHROOM + HELP";
  }

  else if (flex1Bent && !flex2Bent && !flex3Bent) {
    currentMessage = "I NEED WATER";
  }

  else if (!flex1Bent && flex2Bent && !flex3Bent) {
    currentMessage = "I WANT TO GO TO WASHROOM";
  }

  else if (!flex1Bent && !flex2Bent && flex3Bent) {
    currentMessage = "I NEED HELP";
  }

  else {
    currentMessage = "NO REQUEST DETECTED";
  }
}

// =====================================
// HTML DASHBOARD
// =====================================

const char webpage[] PROGMEM = R"rawliteral(

<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Smart Communication Glove</title>

<style>

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: Arial, sans-serif;
  background: #0f172a;
  color: white;
  padding: 15px;
}

.container {
  max-width: 900px;
  margin: auto;
}

header {
  text-align: center;
  padding: 25px 10px;
  background: #1e293b;
  border-radius: 15px;
  margin-bottom: 20px;
}

header h1 {
  color: #38bdf8;
  font-size: 25px;
  margin-bottom: 10px;
}

header p {
  color: #cbd5e1;
  font-size: 14px;
}

.card {
  background: #1e293b;
  padding: 20px;
  margin-bottom: 18px;
  border-radius: 12px;
  border: 1px solid #334155;
}

.card h2 {
  color: #38bdf8;
  font-size: 19px;
  margin-bottom: 15px;
}

.sensor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.sensor {
  background: #334155;
  padding: 18px 10px;
  border-radius: 10px;
  text-align: center;
}

.sensor h3 {
  font-size: 16px;
  margin-bottom: 12px;
}

.status {
  font-weight: bold;
  padding: 7px 12px;
  display: inline-block;
  border-radius: 20px;
  font-size: 13px;
}

.normal {
  background: #14532d;
  color: #86efac;
}

.bent {
  background: #7f1d1d;
  color: #fecaca;
}

.value {
  margin-top: 12px;
  color: #cbd5e1;
  font-size: 14px;
}

.message-card {
  text-align: center;
}

.message {
  font-size: 23px;
  font-weight: bold;
  color: #4ade80;
  padding: 15px 5px;
  overflow-wrap: anywhere;
}

.emergency {
  background: #7f1d1d;
  border: 2px solid #ef4444;
  animation: blink 1s infinite;
}

.emergency .message {
  color: #ffffff;
}

@keyframes blink {
  50% {
    opacity: 0.65;
  }
}

.location-card {
  border: 1px solid #38bdf8;
  background: #172554;
}

.location-details {
  padding: 10px 0;
}

.location-details h3 {
  color: #38bdf8;
  font-size: 19px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.location-details p {
  color: #94a3b8;
  margin-top: 8px;
  margin-bottom: 15px;
  font-size: 13px;
}

.map-button {
  display: inline-block;
  background: #0284c7;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
  font-size: 14px;
}

.map-button:hover {
  background: #0369a1;
}

.connection {
  text-align: center;
  color: #86efac;
  margin: 15px 0;
  font-size: 13px;
}

footer {
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  padding: 15px;
}

@media(max-width: 450px) {

  header h1 {
    font-size: 21px;
  }

  .message {
    font-size: 19px;
  }

}

</style>

</head>

<body>

<div class="container">

<header>

<h1>SMART ASSISTIVE COMMUNICATION GLOVE</h1>

<p>ESP32 Based Assistive Communication System</p>

</header>

<!-- PATIENT LOCATION -->

<div class="card location-card">

<h2>📍 PATIENT LOCATION</h2>

<div class="location-details">

<h3 id="location">
Silicon University, Silicon Hills, Patia, Bhubaneswar
</h3>

<p>Registered Patient Location</p>

<a
href="https://www.google.com/maps/search/?api=1&query=Silicon+University+Silicon+Hills+Patia+Bhubaneswar"
target="_blank"
class="map-button">

VIEW ON GOOGLE MAPS

</a>

</div>

</div>

<!-- SENSOR STATUS -->

<div class="card">

<h2>FLEX SENSOR STATUS</h2>

<div class="sensor-grid">

<div class="sensor">

<h3>FLEX SENSOR 1</h3>

<span id="status1" class="status normal">
NORMAL
</span>

<div class="value">
ADC: <span id="value1">0</span>
</div>

</div>

<div class="sensor">

<h3>FLEX SENSOR 2</h3>

<span id="status2" class="status normal">
NORMAL
</span>

<div class="value">
ADC: <span id="value2">0</span>
</div>

</div>

<div class="sensor">

<h3>FLEX SENSOR 3</h3>

<span id="status3" class="status normal">
NORMAL
</span>

<div class="value">
ADC: <span id="value3">0</span>
</div>

</div>

</div>

</div>

<!-- COMMUNICATION MESSAGE -->

<div class="card message-card" id="messageCard">

<h2>COMMUNICATION MESSAGE</h2>

<div class="message" id="message">
SYSTEM READY
</div>

</div>

<!-- EMERGENCY STATUS -->

<div class="card message-card">

<h2>EMERGENCY STATUS</h2>

<div class="message" id="emergencyStatus">
NO EMERGENCY
</div>

</div>

<div class="connection" id="connection">
● CONNECTED TO ESP32
</div>

<footer>

Smart Assistive Communication Glove<br>
ESP32 Wi-Fi Dashboard

</footer>

</div>

<script>

function updateStatus(elementId, isBent) {

  const element = document.getElementById(elementId);

  if (isBent) {

    element.innerText = "BENT";
    element.className = "status bent";

  } else {

    element.innerText = "NORMAL";
    element.className = "status normal";

  }

}

async function getSensorData() {

  try {

    const response = await fetch("/data");

    if (!response.ok) {
      throw new Error("Server response error");
    }

    const data = await response.json();

    // ADC VALUES
    document.getElementById("value1").innerText = data.v1;
    document.getElementById("value2").innerText = data.v2;
    document.getElementById("value3").innerText = data.v3;

    // SENSOR STATUS
    updateStatus("status1", data.f1);
    updateStatus("status2", data.f2);
    updateStatus("status3", data.f3);

    // CURRENT MESSAGE
    document.getElementById("message").innerText = data.message;

    // EMERGENCY STATUS
    const emergencyElement =
      document.getElementById("emergencyStatus");

    const messageCard =
      document.getElementById("messageCard");

    if (data.emergency) {

      emergencyElement.innerText = "EMERGENCY ALERT ACTIVE";
      emergencyElement.style.color = "#fca5a5";
      messageCard.classList.add("emergency");

    } else {

      emergencyElement.innerText = "NO EMERGENCY";
      emergencyElement.style.color = "#4ade80";
      messageCard.classList.remove("emergency");

    }

    document.getElementById("connection").innerText =
      "● CONNECTED TO ESP32";

    document.getElementById("connection").style.color =
      "#86efac";

  }

  catch (error) {

    document.getElementById("connection").innerText =
      "● CONNECTION LOST";

    document.getElementById("connection").style.color =
      "#f87171";

  }

}

// Refresh dashboard every 500 milliseconds
setInterval(getSensorData, 500);

getSensorData();

</script>

</body>
</html>

)rawliteral";

// =====================================
// SEND SENSOR DATA AS JSON
// =====================================

void handleData() {

  updateSensors();

  String json = "{";

  json += "\"f1\":";
  json += flex1Bent ? "true" : "false";

  json += ",\"f2\":";
  json += flex2Bent ? "true" : "false";

  json += ",\"f3\":";
  json += flex3Bent ? "true" : "false";

  json += ",\"emergency\":";
  json += emergency ? "true" : "false";

  json += ",\"v1\":";
  json += String(flex1Value);

  json += ",\"v2\":";
  json += String(flex2Value);

  json += ",\"v3\":";
  json += String(flex3Value);

  json += ",\"message\":\"";
  json += currentMessage;
  json += "\"";

  json += "}";

  server.sendHeader("Cache-Control", "no-store");
  server.send(200, "application/json", json);
}

// =====================================
// SETUP
// =====================================

void setup() {

  Serial.begin(115200);

  analogReadResolution(12);

  pinMode(flex1Pin, INPUT);
  pinMode(flex2Pin, INPUT);
  pinMode(flex3Pin, INPUT);

  // Start ESP32 Access Point
  WiFi.mode(WIFI_AP);

  bool result = WiFi.softAP(apSSID, apPassword);

  if (result) {

    Serial.println();
    Serial.println("================================");
    Serial.println("SMART COMMUNICATION GLOVE");
    Serial.println("================================");

    Serial.println("Wi-Fi Access Point Started");

    Serial.print("Wi-Fi Name: ");
    Serial.println(apSSID);

    Serial.print("Password: ");
    Serial.println(apPassword);

    Serial.print("Dashboard IP: ");
    Serial.println(WiFi.softAPIP());

  } else {

    Serial.println("Wi-Fi AP START FAILED!");

  }

  // Dashboard routes
  server.on("/", HTTP_GET, []() {

    server.send_P(200, "text/html", webpage);

  });

  server.on("/data", HTTP_GET, handleData);

  server.begin();

  Serial.println("Web Server Started");
  Serial.println("Open http://192.168.4.1");

}

// =====================================
// MAIN LOOP
// =====================================

void loop() {

  server.handleClient();

}
