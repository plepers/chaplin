
Node = require './node'

module.exports = class SiteTree 

    rootNode = {} 

    contructor: () ->
        @rootNode = new Node
        @rootNode.on 'node:change', @nodeChange

    nodeChange:( event ) =>
        console.log event 

    getNode:(route) ->
        
