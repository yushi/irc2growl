var growler = require('growler')

var Growl = module.exports = function Growl(){
  this.growl = new growler.GrowlApplication('irc2growl')
  this.growl.setNotifications({'IRC Message': {}})
  this.growl.register()
}

Growl.prototype.notify = function(title, text){
  this.growl.sendNotification('IRC Message',
                              { 'title': title
                              , 'text': text
                              })
}