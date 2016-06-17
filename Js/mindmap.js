//Script MindMap(add, edit, move,... Node)
function init() 
{
	var $ = go.GraphObject.make;
				
	myDiagram =
				
	$(go.Diagram, "DiagramDiv",{
				
	// position the graph in the middle of the diagram
	initialContentAlignment: go.Spot.Center,  
	
	// Put the diagram contents at the top center of the viewport
    initialDocumentSpot: go.Spot.TopCenter,
    initialViewportSpot: go.Spot.TopCenter,
					
	// allow double-click in background to create a new node
	"clickCreatingTool.archetypeNodeData": { text: "Node", color: "white" },

	// have mouse wheel events zoom in and out instead of scroll up and down
	"toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,
			
	// when the user drags a node, also move/copy/delete the whole subtree starting with that node
	"undoManager.isEnabled": true
					
					
});

// when the document is modified, add a "*" to the title and enable the "Save" button
myDiagram.addDiagramListener("Modified", function(e) {
	var button = document.getElementById("SaveButton");
	if (button) button.disabled = !myDiagram.isModified;
	var idx = document.title.indexOf("*");
	if (myDiagram.isModified) {
		if (idx < 0) document.title += "*";
	} else {
		if (idx >= 0) document.title = document.title.substr(0, idx);
	}
});
				

// a node consists of some text with a line shape underneath
myDiagram.nodeTemplate =
$(go.Node, "Auto",  {
		selectionObjectName: "TEXT", 
		rotatable: true, 
		locationSpot: go.Spot.Center,
		resizable: true
	},new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
					
					
	/*
	$(go.Picture,{
			margin: 10, 
			width: 50, 
			height: 50, 
			background: "red" 
		},
		new go.Binding("source")
	),*/
	
		
	$(go.Shape,"RoundedRectangle", 
			//"Ellipse", 
		{
			parameter1: 20, // the corner has a large radius
			name: "SHAPE", 
			fill: $(go.Brush, "Linear", { 0: "rgb(254, 201, 0)", 1: "rgb(254, 162, 0)" }),
			
			portId: "",// this line shape is the port -- what links connect with
			
			fromLinkable: true,
			fromLinkableSelfNode: true, 
			fromLinkableDuplicates: true,
			toLinkable: true, 
			toLinkableSelfNode: true, 
			toLinkableDuplicates: true,
			cursor: "pointer"
			
		},
		new go.Binding("fill", "fill").makeTwoWay(),
	),
	
	$(go.TextBlock, {
			name: "TEXTBLOCK",
			editable: true,
			font: "bold 11pt helvetica, bold arial, sans-serif"
		},
					
					
		// remember not only the text string but the scale and the font in the node data
		new go.Binding("text", "text").makeTwoWay()
	)
);

				
// selected nodes show a button for adding children
myDiagram.nodeTemplate.selectionAdornmentTemplate =
$(go.Adornment, "Spot",
	$(go.Panel, "Auto",
			$(go.Shape, { 
					fill: null, 
					stroke: "blue", 
					strokeWidth: 2 
				}
			),
			$(go.Placeholder)  // a Placeholder sizes itself to the selected Node
    ),
					
	 // the button to create a "next" node, at the top-right corner
    $("Button", {
			alignment: go.Spot.Right,
			alignmentFocus: go.Spot.Left,
			click: addNodeAndLink  // this function is defined below
		},
		
		$(go.Shape, "PlusLine", { 
				width: 10, 
				height: 10 
			}
		)
    ), // end button
					
	$(go.Panel, "Horizontal",{
			alignment: go.Spot.Top, 
			alignmentFocus: go.Spot.Bottom 
		},
		
		$("Button", {
                click: editText,
            },  // defined below, to support editing the text of the node
			
            $(go.TextBlock, "T", { 
					font: "bold 10pt sans-serif", 
					desiredSize: new go.Size(15, 15), 
					textAlign: "center" 
				}
			)
		),
		
		$("Button", {
				click: changeColor // defined below, to support changing the color of the node
			},  
							
				new go.Binding("ButtonBorder.fill", "color", nextColor),
				new go.Binding("_buttonFillOver", "color", nextColor),
			$(go.Shape, { 
					fill: null, stroke: null, desiredSize: new go.Size(15, 15),  
				}
			)
		),
						
		$("Button", { // drawLink is defined below, to support interactively drawing new links
				click: drawLink,  // click on Button and then click on target node
				actionMove: drawLink  // drag from Button to the target node
			},
			$(go.Shape,
              { geometryString: "M0 0 L8 0 8 12 14 12 M12 10 L14 12 12 14" })
		)
		
		/*
		$("Button", {
				actionMove: dragNewNode,  // defined below, to support dragging from the button
				_dragData: { text: "a Node", color: "lightgray" },  // node data to copy
				click: clickNewNode  // defined below, to support a click on the button
            },
			
            $(go.Shape, { 
					geometryString: "M0 0 L3 0 3 10 6 10 x F1 M6 6 L14 6 14 14 6 14z", 
					fill: "gray" 
				}
			)
        )
		*/
	)
);

 function editText(e, button) {
      var node = button.part.adornedPart;
      e.diagram.commandHandler.editTextBlock(node.findObject("TEXTBLOCK"));
}


// the context menu allows users to change the font size and weight,
// and to perform a limited tree layout starting at that node
myDiagram.nodeTemplate.contextMenu =
	$(go.Adornment, "Vertical",
		$("ContextMenuButton",
			$(go.TextBlock, "Bigger"), { 
				click: function(e, obj) {
					changeTextSize(obj, 1.3); 
				} 
			}
		),
						
		$("ContextMenuButton",
			$(go.TextBlock, "Smaller"), { 
				click: function(e, obj) { 
					changeTextSize(obj, 1/1.3); 
				} 
			}
		),
						
		$("ContextMenuButton",
			$(go.TextBlock, "Bold/Normal"), { 
				click: function(e, obj) { 
					toggleTextWeight(obj); 
				} 
			}
		),
						
		$("ContextMenuButton",
			$(go.TextBlock, "Layout"),{
				click: function(e, obj) {
					var adorn = obj.part;
					adorn.diagram.startTransaction("Subtree Layout");
					layoutTree(adorn.adornedPart);
					adorn.diagram.commitTransaction("Subtree Layout");
				}
			}
		),
					
		//Button Coppy_Node
		$("ContextMenuButton",
			$(go.TextBlock, "Copy"),{
				click: function(e, obj) {
					e.diagram.commandHandler.copySelection();
				}
			}
		),
					
		//Button paste_node
		$("ContextMenuButton",
			$(go.TextBlock, "Paste"),{
				click: function(e, obj) {
					e.diagram.commandHandler.pasteSelection(e.diagram.lastInput.documentPoint);
				}
			}
		),
					
		//Button Cut_Node
		$("ContextMenuButton",
			$(go.TextBlock, "Cut"),{
				click: function(e, obj) {
					 e.diagram.commandHandler.cutSelection(); 
				}
			}
		),
					
		//Button Delete
		$("ContextMenuButton",
			$(go.TextBlock, "Delete"),{
				click: function(e, obj) {
					 e.diagram.commandHandler.deleteSelection();  
				}
			}
		)
	);

// a link is just a Bezier-curved line of the same color as the node to which it is connected
myDiagram.linkTemplate = 
$(go.Link, {
	curve: go.Link.Bezier,
	fromShortLength: -2,
	toShortLength: -2,
			
					
	//routing: go.Link.Orthogonal, 
	//corner: 3,
	selectable: false
},
	$(go.Shape,{ 
		strokeWidth: 3,
		//stroke: "#555"
	},
	new go.Binding("stroke", "toNode", function(n) {
		if (n.data.brush) {
			return n.data.brush;
		}
		return "black";
	}).ofObject())
);

// the Diagram's context menu just displays commands for general functionality
myDiagram.contextMenu =
$(go.Adornment, "Vertical",
	$("ContextMenuButton",
		$(go.TextBlock, "Undo"),{ 
			click: function(e, obj) {
				e.diagram.commandHandler.undo(); 
			} 
		},
						
		new go.Binding("visible", "", function(o) {
			return o.diagram.commandHandler.canUndo(); 
		}).ofObject()
	),
					
	$("ContextMenuButton",
		$(go.TextBlock, "Redo"),{ 
			click: function(e, obj) {
				e.diagram.commandHandler.redo(); 
			} 
		},
						
		new go.Binding("visible", "", function(o) {
			return o.diagram.commandHandler.canRedo(); 
		}).ofObject()
	),
					
	$("ContextMenuButton",
		$(go.TextBlock, "Save"),{ 
			click: function(e, obj) {
				save(); 
			} 
		}
	),
						
	$("ContextMenuButton",
		$(go.TextBlock, "Load"),{
			click: function(e, obj) {
				load();
			}
		}
	),
					
	$("ContextMenuButton",
		$(go.TextBlock, "Paste"),{
			click: function(e, obj) {
				e.diagram.commandHandler.pasteSelection(e.diagram.lastInput.documentPoint);
			}
		},
		
		new go.Binding("visible", "", function(o) {
			return o.diagram.commandHandler.canPaste(); 
			}
		).ofObject()
	),
					
						
	$("ContextMenuButton",
		$(go.TextBlock, "Delete"),{
			click: function(e, obj) {
				e.diagram.commandHandler.deleteSelection(); 
			}
		}
	)
);


myDiagram.addDiagramListener("SelectionMoved", function(e) {
	var rootX = myDiagram.findNodeForKey(0).location.x;
	myDiagram.selection.each(function(node) {
		if (node.data.parent !== 0) {
			return; // Only consider nodes connected to the root
		}
							
		var nodeX = node.location.x;
		if (rootX < nodeX && node.data.dir !== "right") {
			node.data.dir = 'right';
			myDiagram.model.updateTargetBindings(node.data);
			layoutTree(node);
		} else if (rootX > nodeX && node.data.dir !== "left") {
			node.data.dir = 'left';
			myDiagram.model.updateTargetBindings(node.data);
			layoutTree(node);
		}
	});
});
				/*
				myDiagram.add(
					// all Parts are Panels
					$(go.Part,
						{position: new go.Point(500, 100)},
						$(go.Panel, "Table", "Vertical",
							{ defaultAlignment: go.Spot.Left, background: "green"},
							
							//Design Button Undo
							$(go.Panel, "Auto",{
									row: 0, column: 0
								},
								
								$("Button",{ 
										margin: 4,
										click: function(e, obj) {
											e.diagram.commandHandler.undo()
										}
									},
									
									$(go.TextBlock, "undo")
								)
							),
							
							//Design Button Redo
							$(go.Panel, "Auto", {
									row: 0, column: 1
								},
								
								$("Button",{ 
									margin: 4,
									click:  function(e, obj) {
											e.diagram.commandHandler.redo()
										}
									},
										
									$(go.TextBlock, "Redo")
								)
							),
							
							//Design Button Layout
							$(go.Panel, "Auto", {
									row: 0, column: 2
								},
								
								$("Button",{ 
									margin: 4,
									click: function() {
											layoutAll()
										}
									},
										
									$(go.TextBlock, "Layout")
								)
							),
							
							//Design Button Save
							$(go.Panel, "Auto",{
									row: 1, column: 0
								},
								
								$("Button",{ 
									margin: 4,
									click: function(){
											save()
										} 
									},
										
									$(go.TextBlock, "Save")
								)
							),
							
							//Design Button Load
							$(go.Panel, "Auto", {
									row: 1, column: 1
								},
								
								$("Button",{ 
									margin: 4,
									click: function(){
											load()
										} 
									},
										
									$(go.TextBlock, "Load")
								)
							)
						)
					)
				);*/

				// read in the predefined graph using the JSON format data held in the "mySavedModel" textarea
	load();
}
			
// used by nextColor as the list of colors through which we rotate
var myColors = ["lightgray", "lightblue", "lightgreen", "yellow", "orange", "pink", "white", "brown", "gold"];

// used by both the Button Binding and by the changeColor click function
function nextColor(c) {
	var idx = myColors.indexOf(c);
	if (idx < 0) return "lightgray";
	if (idx >= myColors.length-1) idx = 0;
	return myColors[idx+1];
}

function changeColor(e, button) {
	var node = button.part.adornedPart;
	var shape = node.findObject("SHAPE");
	if (shape === null) return;
	node.diagram.startTransaction("Change color");
	shape.fill = nextColor(shape.fill);
	var color = nextColor(shape.fill)
	button["_buttonFillNormal"] = color;  // update the button too
	button["_buttonFillOver"] = color;
	//button.mouseEnter(e, button, '');
	node.diagram.commitTransaction("Change color");
}
			
function drawLink(e, button) {
	var node = button.part.adornedPart;
	var tool = e.diagram.toolManager.linkingTool;
	tool.startObject = node.port;
	e.diagram.currentTool = tool;
	tool.doActivate();
}

// the Button.click event handler, called when the user clicks the "N" button
/*
    function clickNewNode(e, button) {
      var data = button._dragData;
      if (!data) return;
      e.diagram.startTransaction("Create Node and Link");
      var fromnode = button.part.adornedPart;
      var newnode = createNodeAndLink(button._dragData, fromnode);
      newnode.location = new go.Point(fromnode.location.x + 200, fromnode.location.y);
      e.diagram.commitTransaction("Create Node and Link");
    }
*/

// the Button.actionMove event handler, called when the user drags within the "N" button
/*
    function dragNewNode(e, button) {
      var tool = e.diagram.toolManager.draggingTool;
      if (tool.isBeyondDragSize()) {
        var data = button._dragData;
        if (!data) return;
        e.diagram.startTransaction("button drag");  // see doDeactivate, below
        var newnode = createNodeAndLink(data, button.part.adornedPart);
        newnode.location = e.diagram.lastInput.documentPoint;
        // don't commitTransaction here, but in tool.doDeactivate, after drag operation finished
        // set tool.currentPart to a selected movable Part and then activate the DraggingTool
        tool.currentPart = newnode;
        e.diagram.currentTool = tool;
        tool.doActivate();
      }
    }
*/


/*
	tool.doDeactivate = function() {
	// commit "button drag" transaction, if it is ongoing; see dragNewNode, above
		if (tool.diagram.undoManager.nestedTransactionNames.elt(0) === "button drag") {
			tool.diagram.commitTransaction();
		}
		
		go.DraggingTool.prototype.doDeactivate.call(tool);  // call the base method
	};*/
			

function spotConverter(dir, from) {
	if (dir === "left") {
		return (from ? go.Spot.Left : go.Spot.Right);
	} else {
		return (from ? go.Spot.Right : go.Spot.Left);
	}
}

function changeTextSize(obj, factor) {
	var adorn = obj.part;
	adorn.diagram.startTransaction("Change Text Size");
	var node = adorn.adornedPart;
	var tb = node.findObject("TEXTBLOCK");
	tb.scale *= factor;
	adorn.diagram.commitTransaction("Change Text Size");
}

function toggleTextWeight(obj) {
	var adorn = obj.part;
	adorn.diagram.startTransaction("Change Text Weight");
	var node = adorn.adornedPart;
	var tb = node.findObject("TEXTBLOCK");
	// assume "bold" is at the start of the font specifier
	var idx = tb.font.indexOf("bold");
	if (idx < 0) {
		tb.font = "bold 11pt helvetica" + tb.font;
	} else {
		tb.font = tb.font.substr(idx + 5);
	}
		adorn.diagram.commitTransaction("Change Text Weight");
}

function addNodeAndLink(e, obj) {
	var adorn = obj.part;
	var diagram = adorn.diagram;
	diagram.startTransaction("Add Node");
	var oldnode = adorn.adornedPart;
	var olddata = oldnode.data;
				
	// copy the brush and direction to the new node data
	var newdata = { text: "idea", brush: olddata.brush, dir: olddata.dir, parent: olddata.key, fill: "#6EC1FF" };
	diagram.model.addNodeData(newdata);
	layoutTree(oldnode);
	diagram.commitTransaction("Add Node");
}

function layoutTree(node) {
	if (node.data.key === 0) { 
	
	// adding to the root?
	layoutAll();  // lay out everything
	} else {  // otherwise lay out only the subtree starting at this parent node
		var parts = node.findTreeParts();
		layoutAngle(parts, node.data.dir === "left" ? -180 : 0);
	}
}

function layoutAngle(parts, angle) {		
	var layout = go.GraphObject.make(go.TreeLayout, {
		angle: angle,
		arrangement: go.TreeLayout.ArrangementFixedRoots,
		nodeSpacing: 5,
		layerSpacing: 20 
	});
	layout.doLayout(parts);
}

function layoutAll() {
	var root = myDiagram.findNodeForKey(0);
	if (root === null) 
	{
		return;
	}	
	myDiagram.startTransaction("Layout");
				
	// split the nodes and links into two collections
	var rightward = new go.Set(go.Part);
	var leftward = new go.Set(go.Part);
	root.findLinksConnected().each(
		function(link) {
			var child = link.toNode;
			if (child.data.dir === "left") {
				leftward.add(root);  // the root node is in both collections
				leftward.add(link);
				leftward.addAll(child.findTreeParts());
			} else {
				rightward.add(root);  // the root node is in both collections
				rightward.add(link);
				rightward.addAll(child.findTreeParts());
			}
		}
	);
				
	// do one layout and then the other without moving the shared root node
	layoutAngle(rightward, 0);
	layoutAngle(leftward, 180);
	myDiagram.commitTransaction("Layout");
}

// Show the diagram's model in JSON format
function save() {
	document.getElementById("mySavedModel").value = myDiagram.model.toJson();
	myDiagram.isModified = false;
}

function load() {
	myDiagram.model = go.Model.fromJson(document.getElementById("mySavedModel").value);
}
		
			
function saveTextAsFile(){	
	var textToWrite = document.getElementById("mySavedModel").value;
	var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
	var fileNameToSaveAs = document.getElementById("inputFileNameToSaveAs").value;
	var downloadLink = document.createElement("a");
	downloadLink.download = fileNameToSaveAs;
	downloadLink.innerHTML = "Download File";
	
	if (window.webkitURL != null){
		// Chrome allows the link to be clicked
		// without actually adding it to the DOM.
		downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
	}else{
		// Firefox requires the link to be added to the DOM
		// before it can be clicked.
		downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
		downloadLink.onclick = destroyClickedElement;
		downloadLink.style.display = "none";
		document.body.appendChild(downloadLink);
	}

	downloadLink.click();
	save();
}

function destroyClickedElement(event){
	document.body.removeChild(event.target);
}
	
function loadFileAsText(){
	var fileToLoad = document.getElementById("fileToLoad").files[0];

	var fileReader = new FileReader();
	fileReader.onload = function(fileLoadedEvent) {
		var textFromFileLoaded = fileLoadedEvent.target.result;
		document.getElementById("mySavedModel").value = textFromFileLoaded;
	};
	fileReader.readAsText(fileToLoad, "UTF-8");
	load();
}
			
//Search node with name_node
function searchDiagram() {  // called by button
	var input = document.getElementById("mySearch");
	if (!input) return;
	input.focus();

	// create a case insensitive RegExp from what the user typed
	var regex = new RegExp(input.value, "i");

	myDiagram.startTransaction("highlight search");
	myDiagram.clearHighlighteds();

	// search four different data properties for the string, any of which may match for success
	if (input.value) {  // empty string only clears highlighteds collection
		var results = myDiagram.findNodesByExample({ text: regex });
		myDiagram.highlightCollection(results);
		// try to center the diagram at the first node that was found
		if (results.count > 0){
			myDiagram.centerRect(results.first().actualBounds);
		}
	}

	myDiagram.commitTransaction("highlight search");
}

$(document).ready(function(){
	$('#imgage_gallery').click(function(){
		$('#thumb').slideToggle('slow');
		$('#Hotkeys_Table').hide('slow');
	});
				
	$('li img').click(function(){
		var imgbg = $(this).attr('dir');
	//console.log(imgbg);
		$('#load').css({backgroundImage: "url("+imgbg+")"});	
							
		});
						
		$('#bgimage').click(function(){
			$('#thumb').hide();
			$('#Hotkeys_Table').hide('slow');
		});
						
		$('#DiagramDiv').click(function(){
			$('#thumb').hide('slow');
			$('#Hotkeys_Table').hide('slow');
		});
						
		$('#Keyboard_Shortcuts').click(function(){
			$('#Hotkeys_Table').slideToggle('slow');
			$('#thumb').hide('slow');
		});
	}
);

$(function() {
	$( "#menu" ).draggable({containment: '.mindMap', cursor: 'move', snap: '.mindMap'});
				
	$('#verborgen_file').hide();
	$('#uploadButton').on('click', function () {
		$('#verborgen_file').click();
	});

	$('#verborgen_file').change(function () {
		var file = this.files[0];
		var reader = new FileReader();
		reader.onloadend = function () {
			$('#load').css('background', 'url("' + reader.result + '")no-repeat center center fixed');
		}
		
		if (file) {
			reader.readAsDataURL(file);
		} else {}
	});
});

