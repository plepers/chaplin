
Backbone = require 'backbone'

module.exports = class Node 
    
    @extend = Backbone.Events.extend


    parent = null
    children = []

    contructor:( parent )->
        @parent ?= parent