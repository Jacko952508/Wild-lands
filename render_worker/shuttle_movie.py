import bpy, math, random, os
from mathutils import Vector
random.seed(7)
OUT="//render_output"
os.makedirs(bpy.path.abspath(OUT), exist_ok=True)

# reset
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for d in (bpy.data.materials, bpy.data.curves, bpy.data.meshes, bpy.data.cameras, bpy.data.lights):
    pass

def mat(name, color, metallic=0, rough=.45, emission=None, alpha=1):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,alpha)
    m.use_nodes=True; bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1); bs.inputs['Metallic'].default_value=metallic; bs.inputs['Roughness'].default_value=rough
    if emission:
        (bs.inputs.get('Emission Color') or bs.inputs.get('Emission')).default_value=(*emission,1); bs.inputs['Emission Strength'].default_value=5
    if alpha<1:
        bs.inputs['Alpha'].default_value=alpha; m.blend_method='BLEND'
    return m
WHITE=mat('thermal tiles',(0.72,.75,.77),.12,.32)
BLACK=mat('heat shield',(.015,.018,.022),.05,.7)
DARK=mat('carbon dark',(.035,.045,.055),.35,.28)
METAL=mat('engine metal',(.10,.12,.14),.8,.22)
GLASS=mat('canopy',(.025,.09,.14),.35,.12,alpha=.68)
ORANGE=mat('tank orange',(.45,.16,.035),.05,.55)
STEEL=mat('tower steel',(.12,.14,.15),.75,.35)
CONC=mat('concrete',(.11,.105,.095),0,.9)
FIRE=mat('engine flame',(1,.15,.01),0,.2,emission=(1,.07,.005))
BLUEF=mat('hot core',(.12,.45,1),0,.1,emission=(.1,.35,1))
SMOKE=mat('smoke',(.22,.21,.20),0,1,alpha=.32)
LIGHT=mat('pad light',(1,.55,.12),0,.25,emission=(1,.35,.06))

def smooth(obj):
    if obj.type=='MESH':
        for p in obj.data.polygons: p.use_smooth=True
    return obj

def cube(name, loc, scale, material, bevel=.08):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod=o.modifiers.new('edge bevel','BEVEL'); mod.width=bevel; mod.segments=3
    o.data.materials.append(material); return o

def cyl(name, loc, radius, depth, material, vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o=bpy.context.object; o.name=name; o.data.materials.append(material); return smooth(o)

def sphere(name, loc, scale, material, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=16, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; o.data.materials.append(material); return smooth(o)

def cone(name, loc, r1,r2,depth,material,vertices=48):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2, depth=depth, location=loc)
    o=bpy.context.object; o.name=name; o.data.materials.append(material); return smooth(o)

# world
world=bpy.context.scene.world
world.color=(.005,.009,.018)
world.use_nodes=True
bg=world.node_tree.nodes['Background']; bg.inputs['Color'].default_value=(.004,.008,.02,1); bg.inputs['Strength'].default_value=.18

# ground/pad
cube('ground',(0,0,-.65),(140,140,1.2),CONC,.1)
cube('launch pad',(0,0,.05),(28,28,1.2),DARK,.15)
# trench
cube('flame trench',(0,-5,-.1),(8,24,1.1),BLACK,.1)
for x in (-11,11):
    for y in range(-11,12,4):
        cyl('pad lamp',(x,y,.9),.11,1.7,STEEL,16)
        sphere('lamp',(x,y,1.8),(.18,.18,.18),LIGHT,16)

# launch tower lattice
for z in range(0,42,4):
    for x in (-9,-6):
        for y in (-5,5):
            cube('tower',(x,y,z+1),(0.35,.35,4),STEEL,.03)
    for y in (-5,5):
        cube('tower beam',(-7.5,y,z+2),(3.4,.25,.25),STEEL,.02)
    cube('tower cross',(-7.5,0,z+2),(.25,10,.25),STEEL,.02)
for z in (8,16,24,32):
    cube('service arm',(-4.0,0,z),(7,.5,.45),STEEL,.04)

# shuttle assembly parent
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,2.2)); ship=bpy.context.object; ship.name='SHUTTLE_ASSEMBLY'

# external tank
tank=cyl('external tank',(0,1.5,14.5),2.25,25,ORANGE,64); tank.parent=ship
# pointed tank cap
cap=cone('tank cap',(0,1.5,27.5),2.25,.15,3.2,ORANGE,64); cap.parent=ship
# boosters
for x in (-3.25,3.25):
    b=cyl('solid booster',(x,1.7,13.5),1.25,24,WHITE,48); b.parent=ship
    n=cone('booster nose',(x,1.7,26.1),1.25,.05,3.0,WHITE,48); n.parent=ship
    noz=cone('booster nozzle',(x,1.7,1.1),1.0,.55,2.0,METAL,48); noz.parent=ship

# orbiter body: fuselage along Z
body=cyl('orbiter fuselage',(0,-1.45,14.0),1.55,18,WHITE,64); body.parent=ship
nose=cone('orbiter nose',(0,-1.45,24.1),1.55,.08,4.2,WHITE,64); nose.parent=ship
# black belly strip
belly=cube('heat shield belly',(0,-2.55,13.2),(2.7,.22,15.0),BLACK,.18); belly.parent=ship
# cockpit canopy
can=sphere('cockpit canopy',(0,-2.35,20.9),(1.15,.55,1.7),GLASS,40); can.parent=ship
# wings custom triangular prisms using mesh
def wing(name, side):
    verts=[(0,-1.1,15),(side*1.2,-1.0,15),(side*7,-.25,9),(side*6.4,.2,8),(0,.3,10.5),
           (0,-1.1,14.4),(side*1.2,-1.0,14.4),(side*7,-.25,8.4),(side*6.4,.2,7.4),(0,.3,9.9)]
    faces=[(0,1,2,3,4),(5,9,8,7,6),(0,5,6,1),(1,6,7,2),(2,7,8,3),(3,8,9,4),(4,9,5,0)]
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update(); o=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(o); o.data.materials.append(WHITE); o.parent=ship
    bevel=o.modifiers.new('wing bevel','BEVEL'); bevel.width=.12; bevel.segments=3
    return o
wing('left delta wing',-1); wing('right delta wing',1)
# tail
tail=cube('vertical tail',(0,.15,17.2),(.45,3.0,6.4),WHITE,.15); tail.rotation_euler[0]=math.radians(-8); tail.parent=ship
# engines
for x in (-.95,0,.95):
    e=cone('main engine',(x,-.65,4.7),.75,.45,2.2,METAL,48); e.parent=ship
    inner=cone('engine throat',(x,-.65,4.2),.5,.24,1.4,BLACK,48); inner.parent=ship
# panel seams / RCS
for z in (8,11,14,17,20):
    ring=cyl('panel ring',(0,-1.45,z),1.59,.10,DARK,64); ring.parent=ship
for x in (-1.2,1.2):
    pod=cube('RCS pod',(x,-1.55,22.2),(.55,.75,1.5),DARK,.16); pod.parent=ship

# static buildings
for i in range(18):
    a=2*math.pi*i/18; r=random.uniform(42,60); h=random.uniform(4,12)
    cube('facility',(math.cos(a)*r,math.sin(a)*r,h/2-.05),(random.uniform(5,10),random.uniform(5,10),h),CONC,.15)

# stars
for i in range(180):
    a=random.uniform(0,2*math.pi); z=random.uniform(25,80); r=random.uniform(50,95)
    sphere('star',(math.cos(a)*r,math.sin(a)*r,z),(.035,.035,.035),LIGHT,8)

# exhaust and smoke objects, parent to world but animated
flames=[]
for x,y in [(-3.25,1.7),(3.25,1.7),(-.95,-.65),(0,-.65),(.95,-.65)]:
    f=cone('flame',(x,y,.2),.55,.12,6.0,FIRE,32); flames.append((f,Vector((x,y,0))))
    c=cone('core',(x,y,.8),.28,.05,4.2,BLUEF,24); flames.append((c,Vector((x,y,0.6))))
smokes=[]
for i in range(70):
    ang=random.uniform(0,2*math.pi); rad=random.uniform(1,15); z=random.uniform(.2,2.4)
    s=sphere('smoke',(math.cos(ang)*rad,math.sin(ang)*rad,z),(random.uniform(.8,2.4),)*3,SMOKE,16)
    smokes.append((s,ang,rad,random.uniform(.7,1.5)))

# lights
bpy.ops.object.light_add(type='AREA', location=(12,-18,28)); key=bpy.context.object; key.data.energy=1800; key.data.shape='DISK'; key.data.size=14
key.rotation_euler=(math.radians(28),0,math.radians(35))
bpy.ops.object.light_add(type='POINT', location=(0,0,5)); launchlight=bpy.context.object; launchlight.data.energy=0; launchlight.data.color=(1,.22,.03)
bpy.ops.object.light_add(type='AREA', location=(-16,10,20)); fill=bpy.context.object; fill.data.energy=900; fill.data.color=(.18,.28,1); fill.data.size=10

# camera
bpy.ops.object.camera_add(location=(24,-34,12)); cam=bpy.context.object; bpy.context.scene.camera=cam
cam.data.lens=48

def look_at(obj, target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

# animation
scene=bpy.context.scene; scene.frame_start=1; scene.frame_end=144; scene.render.fps=24
scene.render.engine='BLENDER_EEVEE'
scene.eevee.use_gtao=True; scene.eevee.gtao_distance=4; scene.eevee.gtao_factor=1.35
scene.eevee.use_bloom=True; scene.eevee.bloom_intensity=.08; scene.eevee.bloom_radius=5
scene.eevee.use_soft_shadows=True
scene.render.resolution_x=540; scene.render.resolution_y=960; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
scene.view_settings.look='Medium High Contrast'; scene.view_settings.exposure=-.15

# motion blur
scene.eevee.use_motion_blur=True; scene.eevee.motion_blur_shutter=.45

for frame in range(1,145):
    scene.frame_set(frame); t=(frame-1)/143
    # ignition 0-.18, lift after .18
    if t<.18: z=2.2
    else:
        u=(t-.18)/.82; z=2.2 + 62*(u*u*(.55+.45*u))
    ship.location.z=z
    # slight vibration on ignition
    if .08<t<.25:
        ship.location.x=.04*math.sin(frame*2.3); ship.rotation_euler[1]=.003*math.sin(frame*1.7)
    else:
        ship.location.x=0; ship.rotation_euler[1]=0
    ship.keyframe_insert('location',frame=frame); ship.keyframe_insert('rotation_euler',frame=frame)

    ign=max(0,min(1,(t-.05)/.08))
    launchlight.data.energy=3500*ign; launchlight.keyframe_insert('energy',frame=frame)
    launchlight.location.z=max(3,z+1); launchlight.keyframe_insert('location',frame=frame)
    # flame objects follow ship after liftoff
    for j,(f,base) in enumerate(flames):
        f.location.x=base.x+ship.location.x; f.location.y=base.y
        f.location.z=base.z + max(0,z-2.2)
        pulse=.85+.18*math.sin(frame*.9+j)
        f.scale=(pulse,pulse,ign*(.35+1.1*max(0,t-.18)))
        f.hide_render=ign<.02
        f.keyframe_insert('location',frame=frame); f.keyframe_insert('scale',frame=frame); f.keyframe_insert('hide_render',frame=frame)

    # smoke expands after ignition, stays ground-hugging
    for i,(s,ang,rad,spd) in enumerate(smokes):
        age=max(0,t-.07)
        rr=rad + age*28*spd
        s.location.x=math.cos(ang)*rr; s.location.y=math.sin(ang)*rr; s.location.z=.5+age*3+0.4*math.sin(i)
        sc=(.25+age*2.8)*(1+(i%5)*.08)
        s.scale=(sc*1.6,sc*1.6,sc*.65)
        s.hide_render=t<.07
        s.keyframe_insert('location',frame=frame); s.keyframe_insert('scale',frame=frame); s.keyframe_insert('hide_render',frame=frame)

    # camera: close ignition -> pad wide -> tracking -> tower flyby
    if t<.22:
        u=t/.22; cam.location=(8-2*u,-16+2*u,4.0+3*u); target=(0,0,4.5+3*u)
        cam.data.lens=58-8*u
    elif t<.48:
        u=(t-.22)/.26; cam.location=(20-5*u,-30+4*u,10+8*u); target=(0,0,z+7)
        cam.data.lens=46
    elif t<.75:
        u=(t-.48)/.27; cam.location=(-15+7*u,-24+8*u,z*.28+8); target=(0,0,z+8)
        cam.data.lens=52
    else:
        u=(t-.75)/.25; cam.location=(-8+4*u,-12+3*u,z-10+u*5); target=(0,0,z+8)
        cam.data.lens=42
    look_at(cam,target); cam.keyframe_insert('location',frame=frame); cam.keyframe_insert('rotation_euler',frame=frame); cam.data.keyframe_insert('lens',frame=frame)

scene.render.filepath=OUT+"/frame_"
scene.render.image_settings.color_mode='RGB'
bpy.ops.render.render(animation=True)
