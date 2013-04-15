define [
  'underscore'
  'jquery'
  'backbone'
  'chaplin/mediator'
  'chaplin/tree/sitetree'
  'chaplin/tree/path'
  'chaplin/tree/node'
], (_, $, Backbone, mediator, SiteTree, Path, Node) ->
  'use strict'

  describe 'Node', ->

    tree = null
    

    beforeEach ->
      tree = SiteTree.getInstance()
      tree.buildTree createDescriptor(), null


    afterEach ->
      tree.dispose()

  
    it 'node structure size', ->
      root = SiteTree.getInstance().rootNode
      rchildren = root.getChildren()
      
      # root
      expect( rchildren ).to.have.length(3);

      # a1
      expect( rchildren[0].getChildren() ).to.have.length(3);

      # b1, b2, b3
      expect( rchildren[0].getChildren()[0].getChildren() ).to.have.length(3);
      expect( rchildren[0].getChildren()[1].getChildren() ).to.have.length(3);
      expect( rchildren[0].getChildren()[2].getChildren() ).to.have.length(3);

      expect( rchildren[0].getChildren()[0].getChildren()[0].getChildren() ).to.have.length(0);
      expect( rchildren[0].getChildren()[0].getChildren()[1].getChildren() ).to.have.length(0);
      expect( rchildren[0].getChildren()[0].getChildren()[2].getChildren() ).to.have.length(0);
      expect( rchildren[0].getChildren()[1].getChildren()[0].getChildren() ).to.have.length(0);
      expect( rchildren[0].getChildren()[1].getChildren()[1].getChildren() ).to.have.length(0);
      expect( rchildren[0].getChildren()[1].getChildren()[2].getChildren() ).to.have.length(0);
      expect( rchildren[0].getChildren()[2].getChildren()[0].getChildren() ).to.have.length(0);
      expect( rchildren[0].getChildren()[2].getChildren()[1].getChildren() ).to.have.length(0);
      expect( rchildren[0].getChildren()[2].getChildren()[2].getChildren() ).to.have.length(0);




    createDescriptor = ->
      desc =
        id : ''
        childs : 
          [ 
            {
              id : 'a1',
              childs : 
                [ 
                  {
                    id : 'b1',
                    childs : 
                      [ 
                        {id : 'c1'},
                        {id : 'c2'},
                        {id : 'c3'},
                      ]
                  },{
                    id : 'b2',
                    childs : 
                      [ 
                        {id : 'c1'},
                        {id : 'c2'},
                        {id : 'c3'},
                      ]
                  },{
                    id : 'b3',
                    childs : 
                      [ 
                        {id : 'c1'},
                        {id : 'c2'},
                        {id : 'c3'},
                      ]
                  }
                ]
            },{
              id : 'a2',
              childs : 
                [ 
                  {id : 'b1'},
                  {id : 'b2'},
                  {id : 'b3'},
                ]
            },{
              id : 'a3',
              childs : 
                [ 
                  {id : 'b1'},
                  {id : 'b2'},
                  {id : 'b3'},
                ]
            },
          ]

   