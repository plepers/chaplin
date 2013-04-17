

Backbone = require 'backbone'
_ = require 'underscore'

module.exports = class Node 
    
    @extend = Backbone.Model.extend

    # Mixin Backbone events.
    _(@prototype).extend Backbone.Events

    id          : null

    parent      : null
    children    : null
    cmap        : null

    constructor:( parent )->
        @parent ?= parent
        @children    = []
        @cmap        = {}

    describe : (data) ->
        @id = data.id

    getChildren : ->
        [].concat @children

    getChild : ( id ) ->
        c = @cmap[id]
        return c if c?
        return null

    addChild : ( node ) ->
        c = @cmap[ node.id ]
        return c if c?
        @children.push node
        @cmap[ node.id ] = node
        return node

    dispose : ->
        if @children? 
            for child in @children
                child.dispose()
        @children = null
        @parent = null
        @cmap = null