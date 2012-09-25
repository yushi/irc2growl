var events = require('events')
  , util = require('util')

var IRCParser = module.exports.IRCParser = function IRCParser(){
  events.EventEmitter.call(this)
  var _this = this
  this.buffer = ""
  this.on('data', function(data){
    _this.buffer += data.toString()
    var idx
    while((idx = _this.buffer.indexOf("\r\n")) != -1){
      _this.emit('line', _this._convert(_this.buffer.substr(0,idx)))
      _this.buffer = _this.buffer.substr(idx + 2)
    }
  })

  this.on('line', function(line){
    console.log(this._convert(line))
  })
}
util.inherits(IRCParser, events.EventEmitter)

IRCParser.prototype.encoding = function encoding(enc){
  if(enc){
    this._encoding = enc
  }
  return this._encoding
}

IRCParser.prototype._convert = function _convert(str){
  try{
    // 非効率?
    var Iconv = require('iconv').Iconv
    var iconv = new Iconv(this.encoding(), 'UTF-8')
    var converted = iconv.convert(str)
    return converted.toString()
  }catch(e){
    console.log(e)
  }
  return str
}

var IRCRecvParser = module.exports.IRCRecvParser = function IRCRecvParser(){
  var _this = this
  IRCParser.call(this)

  this.on('line', function(line){
    var idx
    if((idx = line.indexOf(' ')) == -1){
      return
    }

    var nick = line.substr(0, idx)
    line = line.substr(idx + 1)

    if(nick[0] == ':'){
      nick = nick.substr(1)
    }
    nick = nick.split('!')[0]

    if((idx = line.indexOf(' ')) == -1){
      return
    }

    var type = line.substr(0, idx)
    line = line.substr(idx + 1)

    if((idx = line.indexOf(' ')) == -1){
      return
    }

    var channel = line.substr(0, idx)
    line = line.substr(idx + 1)

    if(line[0] == ':'){
      line = line.substr(1)
    }
    _this.emit(type, nick, channel, line)
  })
}
util.inherits(IRCRecvParser, IRCParser);

var IRCSendParser = module.exports.IRCSendParser = function IRCSendParser(){
  var _this = this
  IRCParser.call(this)

  this.on('line', function(line){
    var idx
    if((idx = line.indexOf(' ')) == -1){
      return
    }

    var type = line.substr(0, idx)
    line = line.substr(idx + 1)

    if((idx = line.indexOf(' ')) == -1){
      return
    }

    var channel = line.substr(0, idx)
    line = line.substr(idx + 1)

    if(line[0] == ':'){
      line = line.substr(1)
    }
    _this.emit(type, "me", channel, line)
  })
}
util.inherits(IRCSendParser, IRCParser);