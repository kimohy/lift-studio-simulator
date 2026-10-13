import bpy,math,os,re,json
from mathutils import Vector
BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+os.sep
OUT=BASE+'blender-output'+os.sep
bpy.ops.wm.open_mainfile(filepath=OUT+'Elevator_B5_10F.blend')
s=bpy.context.scene;s.frame_set(1)
col=bpy.data.collections.new('07_CONTROLLER_CABINET');s.collection.children.link(col)
def material(n,c,metal=0,rough=.4,emission=0):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emission
 return m
shell=material('Controller powder-coated graphite',(.08,.11,.14),.55)
plate=material('Controller galvanized mounting plate',(.40,.47,.51),.75)
pcb=material('FR4 dark green',(.015,.15,.08),.15)
chip=material('IC packages',(.012,.018,.024),.15)
copper=material('Copper traces',(.65,.34,.10),.8)
cyan=material('Controller cyan LED',(.12,.85,.8),0,.3,3)
amber=material('Controller amber LED',(1,.45,.03),0,.3,3)
white=bpy.data.materials.get('Warm LED diffuser')
root=bpy.data.objects.new('CONTROLLER_CABINET',None);col.objects.link(root);root.location=(3.7,0,0);root['simRole']='controllerRoot'
def link(o,n):
 for c in list(o.users_collection):c.objects.unlink(o)
 col.objects.link(o);o.name=n;o.parent=root;o['simRole']='controller';return o
def cube(n,loc,dim,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=link(bpy.context.object,n);o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);b=o.modifiers.new('Edge radius','BEVEL');b.width=.006;b.segments=2;return o
def text(n,body,loc,size=.035,m=white):
 cu=bpy.data.curves.new(n,'FONT');cu.body=body;cu.size=size;cu.align_x='CENTER';cu.align_y='CENTER';cu.extrude=.0002;o=bpy.data.objects.new(n,cu);col.objects.link(o);o.location=loc;o.rotation_euler=(math.pi/2,0,0);o.parent=root;o['simRole']='controller';cu.materials.append(m);return o
def wire(n,points,m,r=.005):
 for a,b in zip(points,points[1:]):
  v=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r,depth=v.length,location=(Vector(a)+Vector(b))/2);o=link(bpy.context.object,n);o.rotation_euler=v.to_track_quat('Z','Y').to_euler();o.data.materials.append(m)
cube('Cabinet back',(0,.16,.95),(.92,.06,1.90),shell)
for x in [-.46,.46]:cube('Cabinet side',(x,0,.95),(.04,.38,1.90),shell)
for z in [.03,1.88]:cube('Cabinet top bottom',(0,0,z),(.92,.38,.05),shell)
cube('DIN mounting plate',(0,.10,.95),(.83,.025,1.75),plate)
cube('Controller title bar',(0,-.12,1.78),(.82,.10,.15),shell)
text('Cabinet title','LIFT / CONTROL',(0,-.181,1.79),.047)
# Variable frequency drive and heat sink.
cube('VFD enclosure',(-.22,-.03,1.40),(.32,.23,.48),chip)
for i in range(9):cube('VFD heatsink',(-.355+i*.034,-.157,1.36),(.012,.04,.27),plate)
cube('VFD display',(-.22,-.165,1.55),(.23,.012,.075),chip)
text('Drive label','VVVF',(-.22,-.18,1.55),.04,cyan)
# Logic PCB with CPU, relays, connectors and traces.
cube('Main control PCB',(.20,.06,1.38),(.35,.025,.50),pcb)
for x,z,w,h in [(.17,1.40,.11,.11),(.28,1.48,.07,.12),(.10,1.52,.07,.08),(.28,1.25,.08,.06)]:
 cube('Controller IC',(x,.032,z),(w,.027,h),chip)
 for k in range(6):cube('IC pins',(x-w/2-.009,.018,z-h/2+.008+k*h/6),(.019,.008,.008),plate)
for j in range(10):
 z=1.17+j*.043;cube('PCB trace',(.2,.044,z),(.29,.003,.002),copper)
for j in range(5):
 cube('Logic LED '+str(j),(.07+j*.061,.015,1.62),(.018,.012,.018),cyan if j<4 else amber)
# Touch diagnostic screen, dynamically replaced in the app.
cube('Controller diagnostic bezel',(0,-.015,.94),(.73,.08,.24),chip)
lcd=cube('Controller live LCD',(0,-.06,.94),(.64,.012,.15),pcb);lcd['simRole']='controllerDisplay'
text('Controller static LCD','READY / 1F',(0,-.072,.94),.055,cyan)['simRole']='controllerStaticText'
for j in range(3):
 x=-.25+j*.25;cube('Contactor '+str(j),(x,-.02,.64),(.16,.14,.20),chip);cube('Contactor label '+str(j),(x,-.098,.65),(.12,.014,.05),plate)
 text('Contactor caption '+str(j),['MAIN','BRAKE','DOOR'][j],(x,-.109,.65),.022,chip)
cube('DIN rail',(0,.03,.37),(.8,.04,.08),plate)
for i in range(16):cube('Terminal '+str(i),(-.365+i*.048,-.01,.37),(.038,.10,.115),copper if i%5==0 else chip)
for j in range(6):
 x=-.35+j*.14;wire('Wiring harness',[(x,.01,.32),(x,-.01,.22),(x*.6,-.01,.16),(x*.6,.13,.08)],cyan if j%2 else amber)
for x in [-.36,.36]:cube('Cabinet foot',(x,0,-.035),(.12,.30,.08),chip)
# Open service door attached alongside the cabinet, preserving a visible hinge.
cube('Open service door',(-.78,.05,.95),(.58,.035,1.8),shell)
text('Service door label','LIFT 01',(-.78,.027,1.61),.05)
text('Service door note','SIMULATION',(-.78,.026,1.48),.025)
for j in range(8):cube('Service door vent',(-.78,.025,.45+j*.035),(.34,.009,.011),chip)
for o in list(bpy.data.objects):
 if o.name in col.objects:continue
 names=[c.name for c in o.users_collection]
 if o.name=='CAR_TRAVEL_CONTROL':o['simRole']='carRoot'
 elif o.name=='COUNTERWEIGHT_TRAVEL':o['simRole']='weightRoot'
 elif o.name in ['Car door L','Car door R']:o['simRole']='carDoor';o['side']=-1 if o.name.endswith('L') else 1
 elif '01_CABIN' in names:o['simRole']='cabin'
 elif '02_CAR_DOORS' in names:o['simRole']='cabin'
 elif '03_LANDINGS_15' in names:
  o['simRole']='landing';n=re.sub(r'\.\d{3}$','',o.name)
  if n.startswith('Landing ') and ' door ' in n:
   label=n.split()[1];o['simRole']='landingDoor';o['floorIndex']=(['B5','B4','B3','B2','B1']+[str(i) for i in range(1,11)]).index(label);o['side']=int(n.split()[-1])
  else:
   m=re.search(r'\b(B[1-5]|10|[1-9])(?:\^|v)?$',n)
   if m:o['floorIndex']=(['B5','B4','B3','B2','B1']+[str(i) for i in range(1,11)]).index(m.group(1))
 elif '04_SHAFT_STRUCTURE' in names:o['simRole']='shaft'
 elif '05_MECHANISM' in names:o['simRole']='mechanism'
 if o.name.startswith('Button '):
  label=o.name[7:];o['action']='car';o['floorIndex']=(['B5','B4','B3','B2','B1']+[str(i) for i in range(1,11)]).index(label)
 if o.name.startswith('Auxiliary ') and not o.name.startswith('Auxiliary label'):
  o['action']={'< >':'open','> <':'close','SOS':'alarm'}.get(o.name[10:],'')
 if o.name.startswith('Call button '):o['action']='hall';o['direction']=1 if '^' in o.name else -1
 if o.name.startswith('Car floor display'):o['simRole']='staticDisplay'
# Add controller camera.
camdata=bpy.data.cameras.new('CAM_05_Controller');cam=bpy.data.objects.new('CAM_05_Controller',camdata);s.collection.objects.link(cam);cam.location=(5.0,-3.4,2.2);cam.rotation_euler=(Vector((3.55,0,.95))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.lens=52
weight=bpy.data.objects['COUNTERWEIGHT_TRAVEL']
weight.animation_data.drivers[0].driver.expression='-16.5-z'
for o in bpy.data.objects:
 if o.name.startswith('Weight suspension rope'):
  for fc in o.animation_data.drivers:
   fc.driver.expression='(34.9+15.75-z)/2' if fc.data_path=='location' else '(34.9-15.75+z)/3.7'
s.frame_set(60);s.camera=cam
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=OUT+'Elevator_With_Controller.blend')
# Export neutral pose; runtime controller owns movement. Keep original Blend animation intact.
s.frame_set(1)
for o in list(bpy.data.objects):
 o.animation_data_clear()
 if o.type in ['LIGHT','CAMERA']:bpy.data.objects.remove(o,do_unlink=True)
for o in list(bpy.data.objects):
 if o.type=='FONT':
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
bpy.ops.export_scene.gltf(filepath=BASE+'dist/assets/elevator.glb',export_format='GLB',export_animations=False,export_extras=True,export_apply=True,export_cameras=False,export_lights=False)
# Separate editable controller-only Blender deliverable (mesh text after export conversion).
for o in list(bpy.data.objects):
 if o.name!='CONTROLLER_CABINET' and o.parent!=root:bpy.data.objects.remove(o,do_unlink=True)
root.location=(0,0,0)
for sc in bpy.data.screens:
 for a in sc.areas:
  if a.type=='VIEW_3D':
   a.spaces.active.region_3d.view_distance=3;a.spaces.active.region_3d.view_location=(0,0,.9);a.spaces.active.region_3d.view_perspective='PERSP'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'Controller_Cabinet.blend')
print('EXPORT COMPLETE')
