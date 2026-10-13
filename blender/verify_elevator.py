import bpy,json,os,math
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out=os.path.join(root,'blender-output')
bpy.ops.wm.open_mainfile(filepath=out+'/Elevator_B5_10F.blend')
s=bpy.context.scene
for ob in bpy.data.objects:
 if ob.type=='LIGHT': ob.visible_glossy=False
# Keep floor indicators discrete, using native frame drivers with no handlers.
for name,expr in [('Car floor display','1 if frame < 210 or frame >= 480 else 0'),('Car floor display 2','1 if 210 <= frame < 480 else 0')]:
 o=bpy.data.objects[name];o.animation_data_clear()
 for axis in range(3):o.driver_add('scale',axis).driver.expression=expr
ld=bpy.data.lights.new('Architectural daylight','SUN');ld.energy=1.2;ld.angle=.4
lo=bpy.data.objects.new('Architectural daylight',ld);s.collection.objects.link(lo);lo.rotation_euler=(math.radians(35),math.radians(-25),math.radians(-25))
levels=['B5','B4','B3','B2','B1']+[str(i) for i in range(1,11)]
assert len([o for o in bpy.data.objects if o.name.startswith('Floor identity ')])==15
assert len([o for o in bpy.data.objects if o.name.startswith('Floor label ')])==15
checks=[]
for f,z,opened,landing in [(1,0,False,'1'),(60,0,True,'1'),(150,0,False,'1'),(270,3.5,False,'2'),(340,3.5,True,'2'),(420,3.5,False,'2'),(540,0,False,'1'),(590,0,True,'1')]:
 s.frame_set(f);car=bpy.data.objects['CAR_TRAVEL_CONTROL'];assert abs(car.location.z-z)<.001,(f,car.location.z)
 for sign in [-1,1]:
  c=bpy.data.objects['Car door L' if sign<0 else 'Car door R'];l=bpy.data.objects['Landing '+landing+' door '+str(sign)]
  expected=sign*(.688 if opened else .228)
  assert abs(c.location.x-expected)<.001,(f,c.name,c.location.x,expected)
  assert abs(l.location.x-expected)<.001,(f,l.name,l.location.x,expected)
 assert abs(bpy.data.objects['COUNTERWEIGHT_TRAVEL'].location.z+z)<.001
 checks.append({'frame':f,'car_height_m':z,'doors_open':opened,'landing':landing})
for l in levels:
 assert bpy.data.objects.get('Landing '+l+' door -1')
 assert bpy.data.objects.get('Landing '+l+' door 1')
s.frame_set(60);s.camera=bpy.data.objects['CAM_01_Lobby'];s.render.filepath=out+'/01_Lobby.png'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=out+'/Elevator_B5_10F.blend')
report={'blender':bpy.app.version_string,'objects':len(bpy.data.objects),'stops':levels,'animation_checks':checks,'status':'PASS'}
with open(out+'/검증결과.json','w',encoding='utf8') as f:json.dump(report,f,indent=2,ensure_ascii=False)
print(json.dumps(report))
s.camera=bpy.data.objects['CAM_02_Interior'];s.render.resolution_x=1200;s.render.resolution_y=1200;s.render.filepath=out+'/02_Interior.png';bpy.ops.render.render(write_still=True)

s.camera=bpy.data.objects['CAM_03_Building_section'];s.render.resolution_x=1000;s.render.resolution_y=1600;s.render.filepath=out+'/03_Building_Section.png';bpy.ops.render.render(write_still=True)
