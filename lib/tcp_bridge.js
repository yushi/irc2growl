var util = require('util')
  , events = require('events')
  , net = require('net')

function ConnectionPair(connA, connB){
  this.onEnd = function(sock){
    return function(){
      sock.destroy()
    }
  }

  this.onClose = function(){
    console.warn('socket closed')
  }

  connA.on('end', this.onEnd(connA))
  connB.on('end', this.onEnd(connB))

  connA.on('close', this.onClose)
  connB.on('close', this.onClose)

  connA.pipe(connB)
  connB.pipe(connA)
}

var TCPBridge = module.exports = function TCPBridge(localAddr, localPort, remoteAddr, remotePort){
  var _this = this
  events.EventEmitter.call(this)
  this.localAddr = localAddr
  this.localPort = localPort
  this.remoteAddr = remoteAddr
  this.remotePort = remotePort
}

util.inherits(TCPBridge, events.EventEmitter)

TCPBridge.prototype._connectionHandler = function(){
  var _this = this
  return function(c){
    console.warn('new connection created')
    var remote = new net.Socket()
    remote.connect(_this.remotePort, _this.remoteAddr)
    var pair = new ConnectionPair(c, remote)

    c.on('data', function(data){
      _this.emit('data_local', data)
    })
    remote.on('data', function(data){
      _this.emit('data_remote', data)
    })
  }
}

TCPBridge.prototype.start = function(){
  this.localServer = net.createServer(this._connectionHandler())
  this.localServer.listen(this.localPort, this.localAddr)
}
