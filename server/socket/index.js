const WebSocket = require('ws');

module.exports = {
    port: process.env.SOCKET_PORT,
    start: () =>  {
        if(!server) {
            server = new Server(process.env.SOCKET_PORT)
        }
        return module.exports
    },
    express: (req, res, next) => {
        server.db = req.db
        server.models = req.models
        next()
    },
}

const server = new Server(module.exports.port)
module.exports.emit = server.emit

function Server(port = 2083) {
    if(!process.env.DEV && process.env.PRIVATE_KEY && process.env.CERTIFICATE) {
        const fs = require('fs');
        const https = require('https')

        const options = {
           key: fs.readFileSync(process.env.PRIVATE_KEY),
           cert: fs.readFileSync(process.env.CERTIFICATE)
        };

        const httpsServer = https.createServer(options)
        this.socket = new WebSocket.Server({ server: httpsServer })
        httpsServer.listen(port)
        console.log("Started wss server on :" + port)
    }else{
        this.socket = new WebSocket.Server({ port: port })
        console.log("Started ws server on :" + port)
    }

    this.handler = require('./handler.js')
    let clients = []
    this.firstEmpty = () => {
        for(let i = 0; i < clients.length; i++) {
            if(!clients[i]) {
                return i
            }
        }
        return clients.length
    }
    this.emit = (func, filter = null) => {
        let users = clients
        if(filter) {
            for(let i = 0; i < Object.keys(filter).length; i++) {
                const key = Object.keys(filter)[i]
                const value = filter[key]
                users = users.filter(k => k != undefined && k[key] === value)
            } 
        }
        for(let i = 0; i < users.length; i++) {
            if(users[i]) func(users[i])
        }
    }
    this.socket.on('connection', (client, req) => {
        let meta = {
            ip: req.connection.remoteAddress,
            db: this.db,
            models: this.models,
            socket: client,
            disconnect: () => {
                client.send(JSON.stringify({type: 'disconnected', content: {}}))
                client.close()
                clients[index] = undefined
            },
            emit: this.emit,
            methods: {},
        }

        let index = this.firstEmpty()
        clients[index] = meta

        let awaiting = {}
        this.DefaultFunction = function(name) {
            return async function() {
                client.send(JSON.stringify({
                    type: ":" + name,
                    content: sanitizeInput(arguments)
                }))
                return new Promise((resolve, reject) => {
                    awaiting[":"+name] = {resolve, reject}
                    setTimeout(function () {
                        if (awaiting[name]) {
                          awaiting[name].reject('timed out. no response was given.')
                          awaiting[name] = undefined
                          meta.disconnect()
                        }
                      }, 1000 * 3)
                })
            }
        }
        meta.methods = {}
        for(let i = 0; i < this.handler.import.length; i++) {
            meta.methods[this.handler.import[i]] = this.DefaultFunction(this.handler.import[i])
        }

        client.send(JSON.stringify({
            type: ':ping',
            content: []
        }))

        client.on('message', async (msg) => {
            try{
                let payload = JSON.parse(msg)
                if(payload.type && payload.content) {
                    if(payload.type.startsWith(':')) {
                        if(awaiting[payload.type]) {
                            awaiting[payload.type].resolve(payload)
                        }
                    }else if(this.handler[payload.type]) {
                        let response = await this.handler[payload.type](meta, ...payload.content)
                        client.send(JSON.stringify({
                            type: payload.type,
                            content: response
                        }))
                    }
                }else{
                    throw "Payload did not contain type and content"
                    
                }
            }catch(e) {
                client.send(JSON.stringify({
                    type: "error",
                    content: e.toString()
                }))
                console.error(e)
            }
        })
    })
}

function sanitizeInput (data) {
    let params = []
    for (let i = 0; i < data.length; i++) {
      params[i] = data[i.toString()]
    }
    return params
}
