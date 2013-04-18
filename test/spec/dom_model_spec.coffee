define [
  'underscore'
  'jquery'
  'backbone'
  'chaplin/mediator'
  'chaplin/models/dom_model'
], (_, $, Backbone, mediator, DomModel) ->
  'use strict'

  describe 'DomModel', ->

    innerBody = null
    dommdl = null
    node = null

    beforeEach ->
      node = document.getElementById 'basic'
      dommdl = new DomModel node
      innerBody = node.innerHTML
      


    afterEach ->
      node.innerHTML = innerBody

  
    it 'parse test 1', ->
      dommdl = new DomModel document.body
      root = dommdl.parse()

      layout = root.children[0]

      expect( layout.id ).to.be 'mainlayout'
      expect( layout.children.length ).to.be 3

    it 'load new tree', (done) ->
      root = dommdl.parse()

      dommdl.on "update", ->
        done()

      dommdl.fetch 
        url : 'assets/structB.html'

    it 'load same tree twice dont trigger event', ->
      dommdl = new DomModel document.body
      dommdl.parse()

      triggered = false
      dommdl.on "update", ->
        triggered = true

      dommdl.parse()

      expect( triggered ).to.be false
       
