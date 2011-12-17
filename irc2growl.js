var net = require('net')
var util = require('util')
var optparse = require('optparse')
var events = require('events')
var growler = require('growler')

var _DEBUG = false;
var DEBUG = function(str){
              if(!_DEBUG){ return }
              if(typeof(str)== 'object'){
                str = util.inspect(str)
              }
              console.log('DEBUG: '  +  str)
}

var switches = [ ['-h', '--help', 'Shows help sections']
               , ['-d', '--debug', 'enable debug message']
               , ['-r', '--remote ADDR:PORT', 'set remote address and port for connect ']
               , ['-l', '--listen ADDR[:PORT]', 'set local address and port for listen'] 
]

var options = { remoteAddr: undefined
              , remotePort: undefined
              , localAddr: "0.0.0.0"
              , localPort: undefined
              }

function ConnectionPair(connA, connB){
  this.onEnd = function(sock){
                 return function(){
                          sock.destroy()
                        }
               }

  this.onClose = function(){ DEBUG('close') }

  connA.on('end', this.onEnd(connA))
  connB.on('end', this.onEnd(connB))

  connA.on('close', this.onClose)
  connB.on('close', this.onClose)

  connA.pipe(connB)
  connB.pipe(connA)
}

function TCPBridge(localAddr, localPort, remoteAddr, remotePort){
  var _this = this
  events.EventEmitter.call(this)
  this.localAddr = localAddr
  this.localPort = localPort
  this.remoteAddr = remoteAddr
  this.remotePort = remotePort
  
  this.connectionHandler = 
    function(c){
      DEBUG('new connection created')
      var remote = new net.Socket()
      remote.connect(remotePort, remoteAddr)
      var pair = new ConnectionPair(c, remote)

      c.on('data', function(data){
                     _this.emit('data_local', data)
                   })
      remote.on('data', function(data){
                          _this.emit('data_remote', data)
                        })
    }
  this.localServer = net.createServer(this.connectionHandler)
  this.localServer.listen(this.localPort, this.localAddr)

}
util.inherits(TCPBridge, events.EventEmitter)

function IRCProtocolParser(){
  events.EventEmitter.call(this)
  var _this = this
  this.buffer = ""
  this.on('data', function(data){
                    _this.buffer += data.toString()
                    var idx
                    while((idx = _this.buffer.indexOf("\r\n")) != -1){
                      _this.emit('line', _this.buffer.substr(0,idx))
                      _this.buffer = _this.buffer.substr(idx + 2)
                    }
                  })
}
util.inherits(IRCProtocolParser, events.EventEmitter)

function IRCLineParseAndNotify(line){
  console.log(line)
  var idx
  if((idx = line.indexOf(' ')) == -1){ return }
  var nick = line.substr(0, idx)
  line = line.substr(idx + 1)

  if(nick[0] == ':'){nick = nick.substr(1)}
  nick = nick.split('!')[0]
  
  if((idx = line.indexOf(' ')) == -1){ return }
  var type = line.substr(0, idx)
  line = line.substr(idx + 1)

  if((idx = line.indexOf(' ')) == -1){ return }
  var channel = line.substr(0, idx)
  line = line.substr(idx + 1)

  if(type == 'NOTICE'||
     type == 'PRIVMSG'
    ){
    var g = new growler.GrowlApplication('irc2growl')
    g.setNotifications({'IRC Message': {}})
    g.register()

    g.sendNotification('IRC Message'
                      ,{ 'title': nick + '@' + channel
                       , 'text': line.substr(1)
                       })
  }
}
var parser = new optparse.OptionParser(switches)

parser.on('help', function(name, value){
                    console.log(parser.toString())
                  })

parser.on('debug', function(name, value){
                     _DEBUG = true
                  })

parser.on('remote', function(name, value){
                      if(value.indexOf(':') == -1 ){
                        console.log('format error: ":" required')
                        process.exit(-1)
                      }
                      var ref = value.split(':')
                      options.remoteAddr = ref[0]
                      options.remotePort = ref[1]
                      if(!options.localPort){
                        options.localPort = options.remotePort
                      }
                    })

parser.on('listen', function(name, value){
                      if(value.indexOf(':') == -1){
                        options.localPort = value
                      }else{
                        var ref = value.split(':')
                        options.localAddr = ref[0]
                        options.localPort = ref[1]
                      }
                    })

parser.parse(process.argv)
DEBUG(options)
var bridge = new TCPBridge( options.localAddr
                          , options.localPort
                          , options.remoteAddr
                          , options.remotePort)

var ircRecvParser = new IRCProtocolParser()
var ircSendParser = new IRCProtocolParser()

ircRecvParser.on('line', IRCLineParseAndNotify)
ircSendParser.on('line', IRCLineParseAndNotify)

bridge.on('data_local', function(data){
                          ircSendParser.emit('data', data)
                        })

bridge.on('data_remote', function(data){
                           ircRecvParser.emit('data', data)
                         })