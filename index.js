const PORT = process.env.PORT || 3000;
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.use(express.static(path.join(__dirname, "client")));

app.get("/", (req, res) => {
    res.sendFile("/index.html");
});

const activeUsers = new Set();

/**
 * io.on("connection" - zavolá se v okamžik, kdy se pokusí připojit klient
 */
io.on("connection", (socket) => {
    // Vypíše kdy připojení nového klienta proběhlo a ze které IP adresy se tato akce uskutečnila
    console.log(`New connection from ${socket.handshake.address}, ${socket.handshake.time}`);
    
    /**
     * Klient po spuštění své aplikace utvoří náhodné jméno a to emitne (pošle) na server
     * socket.on("new user connected" - Server má vytvořený listener "new user connected"
     *  Aby server zachytil náhodné jméno klienta, tak klient musí od sebe emitnout (poslat) svoje náhodné jméno na tento listener - na listener "new user connected"
     *  Jednoduše řečeno můžeme říct, že server a klient mezi sebou vytvořili pomyslný jednosměrný tunel s názvem "new user connected", kde server přijímá data a klient je odesílá
     *  Klient
     *   1. Vytvoří jméno
     *   2. Emitne jméno na "new user connected"
     *  Server
     *   3. Server poslouchá na "new user connected" - zachytí jméno
     *   4. socket.data.user = data; - uloží jméno do socket.data.user
     *   5. io.emit("new user connected", [...activeUsers]); - pošle všem připojeným klientům aktivní uživatele - všechna jména, která zrovna jsou připojená
     *    5.1 u klienta princip zůstává stejný - pokud chce tyto data zachytit, tak musí stejně jako server mít vytvořený listener a na tuto komunikaci poslouchat
     *        Jinak řečeno - u klienta najdeme část kódu ve které bude stejně jako u serveru funkce .on("new user connected", (data) a klient tyto data bude následně zpracovávat
     * 
     *  Samotný koncept připojených uživatelů by se dal rozšířit na úroveň několika místností pro komunikaci. V této ukázce jsou všichni uživatelé připojený do jedné místnosti.
     *  Pro zájemce koncept o práci s místnostmi můžete najít zde https://socket.io/docs/v4/rooms/
     *  Zároveň v naší ukázce posíláme všem klientům v bodě 5. ( io.emit("new user connected" ) jména všech připojených uživatelů - zprávu dostane i klient, který tuto akci vyvolal
     *  Pro vynechání odesílatele původní akce lze použít socket.broadcast.emit
     *  Více o broadcast eventech lze najít zde https://socket.io/docs/v4/broadcasting-events/
     */
    socket.on("new user connected", (data) => {
        socket.data.user = data;
        activeUsers.add(data);
        io.emit("new user connected", [...activeUsers]);
    });

    /**
     * Listener, který zpracovává odpojení klienta od socketu
     *  1. console.log(`${socket.data.user} from ${socket.handshake.address} disconnected`) - vypíše jméno klienta a IP adresu ze které se odpojoval
     *  2. activeUsers.delete(socket.data.user) - odebere jméno klienta z aktivních uživatelů
     *  3. io.emit("user disconnected", socket.data.user) - řekne všem uživatelům přes listener "user disconnected" jméno klienta, který se zrovna odpojil
     *   3.1 klient bude mít zase na svojí straně funkci .on("user disconnected", (data) - kde toto jméno převezme a následně provede potřebnou akci
     */
    socket.on("disconnect", () => {
        console.log(`${socket.data.user} from ${socket.handshake.address} disconnected`);
        activeUsers.delete(socket.data.user);
        io.emit("user disconnected", socket.data.user);
    });

    /**
     * Listener, který zpracovává zprávu od klienta a pošle ji všem připojeným klientům
     */
    socket.on("chat", (data) => {
        io.emit("chat", data);
    });
})

server.listen(PORT, () => console.log(`Server is running on ${PORT}`));
