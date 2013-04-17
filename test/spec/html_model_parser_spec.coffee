define [
  'underscore'
  'jquery'
  'backbone'
  'chaplin/mediator'
  'chaplin/models/html_model_parser'
], (_, $, Backbone, mediator, HtmlModelParser) ->
  'use strict'

  describe 'HtmlModelParser', ->

    
    

    # beforeEach ->
    #   tree = SiteTree.getInstance()
    #   tree.buildTree createDescriptor(), null


    # afterEach ->
    #   tree.dispose()

  
    it 'parse test 1', ->
      parser = new HtmlModelParser
      mdl = parser.parseNode document.body

      expect(mdl.get('labels')).to.be.ok()

      expect(mdl.get('labels').get('cancel')).to.be 'Cancel'

      expect(mdl.get('empty_collection').length).to.be 0

      expect(mdl.get('sections').get('home').get('labels').get('foo')).to.be 'labelA1'
      expect(mdl.get('sections').get('home').get('labels').get('bar')).to.be 'labelA2'
      expect(mdl.get('sections').get('contact').get('labels').get('foo')).to.be 'labelB1'
      expect(mdl.get('sections').get('contact').get('labels').get('bar')).to.be 'labelB2'
       