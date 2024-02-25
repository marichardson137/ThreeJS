var express = require("express");
var app = express();
var expressWs = require("express-ws")(app);
const path = require("path");

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Middleware pass through
app.use(function (req, res, next) {
  return next();
});

// HTTP GET Request
app.get("/", function (req, res, next) {
  console.log("get route");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

let players = [];

// WS GET Request
app.ws("/", function (ws, req) {
  ws.on("message", function (msg) {
    const json = JSON.parse(msg);
    const data = json.data;
    const type = json.type;

    // Check if a player with the same color already exists in the players list
    const existingPlayerIndex = players.findIndex(
      (player) => player.color === data.color
    );

    if (existingPlayerIndex !== -1) {
      // Player exists
      if (type === "disconnect") {
        players.splice(existingPlayerIndex, 1);
        return;
      }
      players[existingPlayerIndex] = data;
    } else {
      // Player does not exist
      console.log(data.color);
      players.push(data);
    }
  });
  broadcastPlayers();
});

// Broadcast Players to all connected clients
function broadcastPlayers() {
  expressWs.getWss().clients.forEach(function each(client) {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(players));
    }
  });
}

setInterval(broadcastPlayers, 1000 / 60);

app.listen(3000);
