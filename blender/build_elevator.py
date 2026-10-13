import bpy, math, os, json
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'blender-output')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
 if c.name != 'Collection': bpy.data.collections.remove(c)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.render.engine='CYCLES'; scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=1400; scene.render.resolution_y=1100; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world.color=(.22,.22,.22)
scene.view_settings.view_transform='AgX'
scene.render.fps=30; scene.frame_end=600
cols={}
for n in ['01_CABIN','02_CAR_DOORS','03_LANDINGS_15','04_SHAFT_STRUCTURE','05_MECHANISM','06_LIGHTS_CAMERAS']:
 c=bpy.data.collections.new(n); scene.collection.children.link(c); cols[n]=c
active='01_CABIN'
def link(o):
 for c in list(o.users_collection): c.objects.unlink(o)
 cols[active].objects.link(o)
 return o
def mat(n,color,metal=0,rough=.4,emit=0):
 m=bpy.data.materials.new(n); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
 if emit: p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emit
 return m
steel=mat('Brushed stainless steel',(.48,.53,.57),.85,.29)
# Fine vertical brushed texture, subtle enough to retain clean metal.
p=steel.node_tree.nodes.get('Principled BSDF'); ns=steel.node_tree.nodes; ls=steel.node_tree.links
tex=ns.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value=160; tex.inputs['Detail'].default_value=2
coord=ns.new('ShaderNodeTexCoord'); mapping=ns.new('ShaderNodeVectorMath'); mapping.operation='MULTIPLY'; mapping.inputs[1].default_value=(1,1,.012)
ls.new(coord.outputs['Generated'],mapping.inputs[0]); ls.new(mapping.outputs[0],tex.inputs['Vector'])
bump=ns.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.12; bump.inputs['Distance'].default_value=.001
ls.new(tex.outputs['Fac'],bump.inputs['Height']); ls.new(bump.outputs['Normal'],p.inputs['Normal'])
dark=mat('Graphite reveals',(.025,.033,.043),.6,.32)
stone=mat('Warm limestone',(.49,.46,.40),0,.65)
floor=mat('Dark terrazzo',(.105,.12,.13),.1,.26)
mirror=mat('Rear mirror',(.82,.88,.91),1,.045)
white=mat('Warm LED diffuser',(1,.84,.64),0,.3,5)
blue=mat('Ice white illuminated digits',(.46,.83,1),0,.3,3)
amber=mat('Selected button amber',(1,.48,.09),.1,.3,3)
black=mat('Display glass',(.006,.012,.016),.25,.17)
concrete=mat('Shaft concrete',(.25,.28,.3),0,.85)
red=mat('Emergency red',(.55,.03,.02),.1,.4)
brass=mat('Champagne accent',(.48,.31,.14),.78,.26)
def cube(n,loc,dim,m,parent=None,bev=.012):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=link(bpy.context.object); o.name=n; o.dimensions=dim
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if m:o.data.materials.append(m)
 if bev:
  mod=o.modifiers.new('Soft machined edges','BEVEL'); mod.width=bev; mod.segments=3
  mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
 if parent:o.parent=parent
 return o
def cyl(n,a,b,r,m,parent=None):
 d=Vector(b)-Vector(a); mid=(Vector(a)+Vector(b))/2
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=d.length,location=mid); o=link(bpy.context.object); o.name=n; o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); o.data.materials.append(m)
 if parent:o.parent=parent
 for p in o.data.polygons:p.use_smooth=True
 return o
def text(n,body,loc,size,m,parent=None,rot=(math.pi/2,0,0)):
 cu=bpy.data.curves.new(n,'FONT');cu.body=body;cu.size=size;cu.align_x='CENTER';cu.align_y='CENTER';cu.extrude=.0005
 o=bpy.data.objects.new(n,cu); cols[active].objects.link(o);o.location=loc;o.rotation_euler=rot;cu.materials.append(m)
 if parent:o.parent=parent
 return o
car=bpy.data.objects.new('CAR_TRAVEL_CONTROL',None);cols[active].objects.link(car)
car['description']='Cabin floor height in metres. Animated 1F to 2F. Floor elevations in FLOOR_SCHEDULE text.'
cube('Car floor',(0,0,-.09),(1.94,1.78,.18),dark,car)
cube('Terrazzo inlay',(0,0,.008),(1.78,1.58,.025),floor,car)
for x in [-.905,.905]:
 cube('Side backing',(x,0,1.2),(.065,1.7,2.4),dark,car)
 for y in [-.55,0,.55]:cube('Vertical stainless side panel',(x,y,1.22),(.044,.535,2.30),steel,car)
 cube('Side skirting',(x*.975,0,.09),(.045,1.6,.14),steel,car)
 cyl('Side handrail',(x*.90,-.65,.9),(x*.90,.68,.9),.023,steel,car)
 for y in [-.5,.5]:cyl('Handrail bracket',(x*.90,y,.9),(x,y,.9),.012,steel,car)
cube('Rear backing',(0,.84,1.2),(1.8,.06,2.4),dark,car)
cube('Rear lower panel',(0,.80,.52),(1.77,.035,1.0),steel,car)
cube('Mirror frame',(0,.795,1.66),(1.58,.04,1.24),brass,car)
cube('Rear mirror',(0,.767,1.66),(1.53,.016,1.19),mirror,car)
cyl('Rear handrail',(-.77,.69,.9),(.77,.69,.9),.023,steel,car)
cube('Ceiling',(0,0,2.43),(1.92,1.74,.09),dark,car)
cube('Ceiling inset',(0,0,2.383),(1.55,1.4,.025),steel,car)
for x in [-.73,.73]:cube('Linear ceiling LED',(x,0,2.36),(.065,1.34,.016),white,car)
for i in range(12):cube('Ceiling ventilation slot',(-.3+i*.055,.59,2.361),(.022,.14,.008),black,car,0)
# Front returns, control panel facing inward, and overhead car display.
for x in [-.69,.69]:cube('Car front return',(x,-.84,1.2),(.46,.07,2.4),steel,car)
cube('Car lintel',(0,-.84,2.28),(.94,.09,.25),steel,car)
cube('COP faceplate',(.69,-.794,1.16),(.31,.025,1.33),dark,car)
# Text on inward-facing front panel must face +Y.
rotin=(math.pi/2,0,math.pi)
def inside_text(n,body,x,z,size,material):return text(n,body,(x,-.772,z),size,material,car,rotin)
inside_text('COP brand','LIFT / 01',.69,1.76,.035,white)
levels=['B5','B4','B3','B2','B1']+[str(i) for i in range(1,11)]
# Five rows, three columns; top row 8/9/10, bottom B5/B4/B3.
for i,label in enumerate(levels):
 row=i//3; col=i%3; x=.79-col*.10; z=.86+row*.145
 cyl('Button '+label,(x,-.775,z),(x,-.754,z),.035,amber if label=='1' else steel,car)
 text('Floor label '+label,label,(x,-.75,z),.027,black,car,rotin)
for x,label in [(.79,'< >'),(.69,'> <'),(.59,'SOS')]:
 cyl('Auxiliary '+label,(x,-.775,.67),(x,-.753,.67),.035,red if label=='SOS' else steel,car)
 text('Auxiliary label '+label,label,(x,-.749,.67),.022,white,car,rotin)
inside_text('Capacity plate','13 PERSONS / 1000 kg',.69,.54,.021,white)
cube('Car display glass',(0,-.785,2.27),(.40,.02,.12),black,car)
inside_text('Car floor display','1  ^',0,2.27,.075,blue)
active='02_CAR_DOORS'
doors=[]
for sign in [-1,1]:
 o=cube('Car door L' if sign<0 else 'Car door R',(sign*.228,-.945,1.08),(.45,.055,2.14),steel,car); doors.append((o,sign))
 cube('Door safety edge',(sign*.008,-.91,1.08),(.012,.012,2.1),dark,o) if False else None
for yy in [-1.005,-.98,-.955]:cube('Car sill groove',(0,yy,.015),(.96,.009,.02),dark,car,0)
active='03_LANDINGS_15'
landing_doors={}
for i,l in enumerate(levels):
 z=(i-5)*3.5
 # Open-front architectural slice, with no slab across the moving shaft.
 cube('Lobby slab '+l,(0,-2.35,z-.16),(5,2.6,.28),concrete)
 cube('Lobby floor '+l,(0,-2.35,z-.012),(5,2.6,.02),stone)
 for x in [-1.53,1.53]:
  cube('Landing wall '+l,(x,-1.13,z+1.55),(1.94,.22,3.1),stone)
 cube('Landing header '+l,(0,-1.13,z+2.72),(1.15,.22,.78),stone)
 for x in [-.52,.52]:cube('Door jamb '+l,(x,-1.27,z+1.11),(.10,.10,2.22),steel)
 cube('Door head '+l,(0,-1.27,z+2.22),(1.14,.10,.11),steel)
 cube('Landing sill '+l,(0,-1.17,z+.01),(1.1,.30,.025),steel)
 ds=[]
 for sign in [-1,1]:
  o=cube('Landing '+l+' door '+str(sign),(sign*.228,-1.18,z+1.08),(.45,.055,2.14),steel);ds.append((o,sign))
 landing_doors[l]=ds
 cube('Landing indicator '+l,(0,-1.261,z+2.47),(.43,.025,.16),black)
 text('Landing display '+l,l,(0,-1.281,z+2.47),.095,blue)
 text('Floor identity '+l,l,(1.65,-1.256,z+1.73),.29,dark)
 text('Floor caption '+l,'LEVEL',(1.65,-1.256,z+1.46),.055,dark)
 cube('Call plate '+l,(.83,-1.268,z+1.16),(.13,.03,.28),steel)
 for dz,label in ([(.055,'^')] if i==0 else ([(-.055,'v')] if i==14 else [(.055,'^'),(-.055,'v')])):
  cyl('Call button '+l+label,(.83,-1.288,z+1.16+dz),(.83,-1.30,z+1.16+dz),.032,dark)
  text('Call arrow '+l+label,label,(.83,-1.305,z+1.16+dz),.033,blue)
active='04_SHAFT_STRUCTURE'
bottom=-19; top=36
for x in [-1.3,1.3]:
 for y in [-.8,1.25]:cube('Shaft structural column',(x,y,(bottom+top)/2),(.17,.17,top-bottom),concrete)
for i in range(16):
 z=-17.5+i*3.5
 cube('Rear crossbeam',(0,1.3,z),(2.75,.16,.18),concrete)
 for x in [-1.3,1.3]:cube('Side crossbeam',(x,.2,z),(.16,2.2,.18),concrete)
cube('Pit slab',(0,.1,bottom),(2.8,2.8,.3),concrete)
active='05_MECHANISM'
for x in [-1.08,1.08]:
 cube('Car guide rail web',(x,.15,8.5),(.035,.08,54),steel,bev=.003)
 cube('Car guide rail flange',(x,.20,8.5),(.10,.022,54),steel,bev=.003)
 for z in [-18+i*3.5 for i in range(16)]:cube('Rail bracket',(x,.3,z),(.18,.24,.07),dark)
# Visible car frame, under-car platform and upper crosshead.
for x in [-.98,.98]:cube('Car sling upright',(x,.2,1.3),(.09,.12,2.95),dark,car)
cube('Car sling top',(0,.2,2.78),(2.12,.15,.14),dark,car)
cube('Car underframe',(0,.2,-.24),(2.1,1.72,.14),dark,car)
weight=bpy.data.objects.new('COUNTERWEIGHT_TRAVEL',None);cols[active].objects.link(weight)
for x in [-.50,.50]:cube('Counterweight upright',(x,1.10,31),(.065,.13,2.5),dark,weight)
for j in range(12):cube('Counterweight slab',(0,1.1,29.85+j*.19),(.94,.16,.17),steel,weight)
for x in [-.60,.60]:cube('Counterweight guide',(x,1.12,8.5),(.045,.05,54),steel)
cube('Motor support',(0,.55,34.45),(2.4,1.4,.15),dark)
cyl('Traction motor',(-.40,.6,34.9),(.20,.6,34.9),.29,dark)
cyl('Traction sheave',(.25,.6,34.9),(.43,.6,34.9),.38,steel)
# Rope lengths driven from moving assembly, endpoints remain attached.
for j in range(4):
 x=-.12+j*.08
 o=cube('Car suspension rope '+str(j),(x,.25,18.8),(.012,.012,32),dark,bev=0)
 for prop,idx,expr in [('location',2,'(34.9+2.85+z)/2'),('scale',2,'(34.9-2.85-z)/32')]:
  d=o.driver_add(prop,idx).driver;d.expression=expr;v=d.variables.new();v.name='z';v.type='TRANSFORMS';v.targets[0].id=car;v.targets[0].transform_type='LOC_Z';v.targets[0].transform_space='LOCAL_SPACE'
 o=cube('Weight suspension rope '+str(j),(x,1.1,33.05),(.012,.012,3.7),dark,bev=0)
 for prop,expr in [('location','(34.9+32.25-z)/2'),('scale','(34.9-32.25+z)/3.7')]:
  d=o.driver_add(prop,2).driver;d.expression=expr;v=d.variables.new();v.name='z';v.type='TRANSFORMS';v.targets[0].id=car;v.targets[0].transform_type='LOC_Z';v.targets[0].transform_space='LOCAL_SPACE'
for x in [-.65,.65]:
 cyl('Pit buffer base',(x,0,-18.84),(x,0,-18.4),.13,dark)
 cyl('Pit buffer piston',(x,0,-18.4),(x,0,-18.05),.075,steel)
# Sequence: open at 1F, close, travel to 2F, open, close, return, open.
for f,z in [(1,0),(150,0),(270,3.5),(420,3.5),(540,0),(600,0)]:car.location.z=z;car.keyframe_insert(data_path='location',frame=f)
d=weight.driver_add('location',2).driver;d.expression='-z';v=d.variables.new();v.name='z';v.type='TRANSFORMS';v.targets[0].id=car;v.targets[0].transform_type='LOC_Z';v.targets[0].transform_space='LOCAL_SPACE'
def animate_doors(items,keys):
 for o,sign in items:
  for f,opening in keys:o.location.x=sign*(.228+.46*opening);o.keyframe_insert(data_path='location',frame=f)
k=[(1,0),(40,1),(100,1),(140,0),(280,0),(320,1),(380,1),(420,0),(550,0),(590,1),(600,1)]
animate_doors(doors,k)
animate_doors(landing_doors['1'],[(1,0),(40,1),(100,1),(140,0),(550,0),(590,1),(600,1)])
animate_doors(landing_doors['2'],[(1,0),(280,0),(320,1),(380,1),(420,0),(600,0)])
for f,n in [(1,'1F / closed'),(60,'1F / open'),(150,'Depart 1F'),(270,'Arrive 2F'),(340,'2F / open'),(420,'Return to 1F'),(590,'1F / open')]:scene.timeline_markers.new(n,frame=f)
# Animated cabin floor display.
digit=bpy.data.objects.get('Car floor display')
digit.data.body='1  ^'
# Use two visibility-keyed text objects to keep the saved animation self contained.
digit2=digit.copy();digit2.data=digit.data.copy();cols['01_CABIN'].objects.link(digit2);digit2.name='Car floor display 2';digit2.data.body='2  v'
for o,second in [(digit,False),(digit2,True)]:
 for f,is2 in [(1,False),(210,True),(480,False),(600,False)]:
  o.scale=(0,0,0) if is2!=second else (1,1,1);o.keyframe_insert(data_path='scale',frame=f)
 if o.animation_data:
  for fc in o.animation_data.action.fcurves if hasattr(o.animation_data.action,'fcurves') else []:
   for kp in fc.keyframe_points:kp.interpolation='CONSTANT'
active='06_LIGHTS_CAMERAS'
def area(n,loc,target,power,size,color=(1,.87,.72),parent=None):
 data=bpy.data.lights.new(n,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
 o=bpy.data.objects.new(n,data);cols[active].objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
 if parent:o.parent=parent
 return o
area('Cabin ceiling illumination',(0,0,2.30),(0,0,0),95,1.35,parent=car)
area('Lobby softbox',(0,-3.8,2.8),(0,0,1.1),500,3.0)
area('Cool side fill',(3,-2,2.5),(0,0,1.2),300,3,(.72,.84,1))
area('Shaft key',(4,-8,26),(0,0,10),5500,12)
area('Shaft fill',(-5,2,6),(0,0,10),3500,10,(.7,.82,1))
def camera(n,loc,target,lens=40,ortho=None):
 data=bpy.data.cameras.new(n);o=bpy.data.objects.new(n,data);cols[active].objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();data.lens=lens;data.clip_end=250
 if ortho:data.type='ORTHO';data.ortho_scale=ortho
 return o
entry=camera('CAM_01_Lobby',(2.9,-6.8,2.8),(0,-.4,1.30),48)
interior=camera('CAM_02_Interior',(-.48,-.66,1.65),(.28,.72,1.30),16)
section=camera('CAM_03_Building_section',(24,-39,23),(0,0,8),45,61)
control=camera('CAM_04_Control_panel',(-.15,.58,1.47),(.58,-.81,1.26),25)
scene.camera=entry;scene.frame_set(60)
for screen in bpy.data.screens:
 for a in screen.areas:
  if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA'
notes=bpy.data.texts.new('START_HERE');notes.write('B5–10F passenger lift | metres | Blender 5.2\n15 stops: B5 B4 B3 B2 B1 1 2 3 4 5 6 7 8 9 10\nFloor pitch: 3.5 m; 1F = 0 m; B5 = -17.5 m; 10F = 31.5 m.\nCabin nominal interior 1.8 x 1.6 x 2.4 m; door opening 0.9 x 2.14 m.\nSpace plays 600-frame demonstration: 1F -> 2F -> 1F, synchronized landing/car doors.\nCameras: lobby, interior, building section, control panel.\nEditable collections separate cabin, doors, landings, shaft and machinery.\nArchitectural visualization, assumed dimensions; machinery and rope reeving simplified, not engineering drawings.\n')
schedule=bpy.data.texts.new('FLOOR_SCHEDULE');schedule.write('\n'.join(f'{l}: {(i-5)*3.5:.2f} m' for i,l in enumerate(levels)))
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/Elevator_B5_10F.blend')
for cam,name,res in [(entry,'01_Lobby',(1400,1100)),(interior,'02_Interior',(1200,1200)),(section,'03_Building_Section',(1000,1600)),(control,'04_Control_Panel',(1100,1200))]:
 scene.camera=cam;scene.render.resolution_x,scene.render.resolution_y=res;scene.render.filepath=OUT+'/'+name+'.png';bpy.ops.render.render(write_still=True)
scene.camera=entry;scene.render.resolution_x=1400;scene.render.resolution_y=1100
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/Elevator_B5_10F.blend')
print('MODEL_COMPLETE',len(bpy.data.objects))
