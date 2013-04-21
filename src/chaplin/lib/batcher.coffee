'use strict'


_ = require 'underscore'
Backbone = require 'backbone'
SyncMachine = require './sync_machine'

class LoadableClass
  @extend = Backbone.Model.extend
  # Mixin Backbone events and EventBroker.
  _(@prototype).extend Backbone.Events


  execute : ->
    #abstract method

  _sendComplete: ->
    @trigger 'complete', @


module.exports = class Batcher
  @extend = Backbone.Model.extend
  _(@prototype).extend LoadableClass.prototype

  @Loadable : LoadableClass

  loadables : null

  getLength : ->
    @loadables.length

  constructor : ->
    _(@).extend SyncMachine
    @loadables = []

  addLoadable : ( loadable ) ->
    if not @isUnsynced()
      throw "Batcher#addLoadable is running!"
    @loadables.push loadable

  execute : ->
    return if not @isUnsynced()
    @beginSync()

    @loadables = _.uniq @loadables

    for l in @loadables
      l.on 'complete', @itemComplete
      l.execute()

  itemComplete : ( item ) =>
    index = _.indexOf @loadables, item
    item.off 'complete', @itemComplete

    @loadables.splice index, 1

    if @loadables.length is 0
      @finishSync()
      @_sendComplete()



