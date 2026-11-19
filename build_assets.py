import numpy as np, cv2, math, os
from PIL import Image, ImageFilter
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals
from pathlib import Path
root = Path(__file__).parent
assets = root/'assets'
assets.mkdir(exist_ok=True)
# Retain original artwork, which belongs to album creator.
Image.open('/mnt/data/KakaoTalk_20261109_162856797.jpg').save(assets/'album-cover.jpg',quality=94)
original = np.array(Image.open('/mnt/data/2.png').convert('RGB'))
# Bounding boxes in original 2048x1448 design sheet, keeping generous quiet margins.
rects = [(145,160,765,587),(758,140,1355,572),(1350,100,1900,655),(725,638,1240,1240),(1340,680,1915,1145)]
for idx,(x0,y0,x1,y1) in enumerate(rects,1):
    sub = original[y0:y1,x0:x1]
    hsv = cv2.cvtColor(sub,cv2.COLOR_RGB2HSV)
    sat = hsv[:,:,1]
    # Sticker silhouette is brightly colored, while the board is almost white.
    dist = 255-np.min(sub,axis=2)
    colored = ((sat>18)&(dist>24)).astype(np.uint8)*255
    colored = cv2.morphologyEx(colored,cv2.MORPH_CLOSE,np.ones((17,17),np.uint8))
    cnts,_=cv2.findContours(colored,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    cnt=max(cnts, key=cv2.contourArea)
    m=np.zeros(colored.shape,np.uint8)
    cv2.drawContours(m,[cnt],-1,255,-1)
    # retain smooth edge, not square crop or white matte
    m=cv2.GaussianBlur(m,(3,3),0.7)
    nz=np.where(m>4)
    xa,xb=max(0,nz[1].min()-12),min(sub.shape[1],nz[1].max()+13)
    ya,yb=max(0,nz[0].min()-12),min(sub.shape[0],nz[0].max()+13)
    rgba=np.dstack((sub,m))[ya:yb,xa:xb]
    Image.fromarray(rgba,'RGBA').save(assets/'stickers'/f'sticker-{idx:02d}.png')
    print('sticker',idx,rgba.shape)
# Apple PBR albedo with film-like tiny pores; wrapped around physical GLB.
w,h=1024,512
rng=np.random.default_rng(5127)
y,x=np.mgrid[0:h,0:w]
# Soft multi-scale mottle.
noise=np.zeros((h,w),np.float32)
for scale,weight in [(8,9),(29,5),(96,3)]:
    coarse=rng.normal(0,1,(max(2,h//scale),max(2,w//scale))).astype(np.float32)
    interp=cv2.resize(coarse,(w,h),interpolation=cv2.INTER_CUBIC)
    noise += interp*weight
fine=rng.normal(0,1,(h,w)).astype(np.float32)*3.2
lat=y/h
# yellow-green rim with darker green lower hemisphere and subtle one-side blush
bright=3.5*np.cos((lat-.42)*np.pi)
gold=6*np.cos((x/w-.32)*np.pi*2)
base=np.zeros((h,w,3),np.float32)
base[:,:,0]=132+bright+gold+noise*.55+fine*.65
base[:,:,1]=175+bright+noise*.55+fine*.65
base[:,:,2]=51+bright*.55-noise*.25+fine*.4
# sparse lenticel pores (not large freckles)
for j in range(2200):
    xx=int(rng.integers(0,w)); yy=int(rng.integers(0,h))
    rad = 1 if rng.random()<.94 else 2
    if rng.random()<.48:
        cv2.circle(base,(xx,yy),rad,tuple(float(v) for v in (min(base[yy,xx,0]+26,255),min(base[yy,xx,1]+26,255),min(base[yy,xx,2]+14,255))),-1,cv2.LINE_AA)
    else:
        cv2.circle(base,(xx,yy),rad,tuple(float(v) for v in (max(base[yy,xx,0]-17,0),max(base[yy,xx,1]-17,0),max(base[yy,xx,2]-6,0))),-1,cv2.LINE_AA)
tex=Image.fromarray(np.uint8(np.clip(base,0,255)),'RGB')
tex.save(assets/'apple-skin.jpg',quality=91)

def surface(theta,phi):
    # soft lobes and cupped top / bottom sculpt a recognizable Granny Smith silhouette
    r=(max(.00001,math.sin(theta))**.67)*(1.00+.12*math.cos(theta))
    r*= (1+.024*math.cos(5*phi)*(math.exp(-(theta/.49)**2)+math.exp(-((math.pi-theta)/.48)**2)))
    py=.95*math.cos(theta) - .18*math.exp(-(theta/.33)**2) + .15*math.exp(-((math.pi-theta)/.35)**2)
    py+=.055*math.cos(5*phi)*math.exp(-((theta-.35)/.26)**2)
    py-=.035*math.cos(5*phi)*math.exp(-((theta-(math.pi-.26))/.25)**2)
    return (r*math.sin(phi),py,r*math.cos(phi))
Nphi=128; Ntheta=76
verts=[]; uvs=[]; faces=[]
for i in range(Ntheta+1):
  theta=.0005+(math.pi-.001)*i/Ntheta
  for j in range(Nphi+1):
    phi=2*math.pi*j/Nphi
    verts.append(surface(theta,phi))
    uvs.append((j/Nphi,1-i/Ntheta))
for i in range(Ntheta):
  for j in range(Nphi):
    a=i*(Nphi+1)+j; b=a+1; c=a+(Nphi+1); d=c+1
    faces += [(a,c,b),(b,c,d)]
mesh=trimesh.Trimesh(vertices=np.array(verts),faces=np.array(faces),process=False)
mat=PBRMaterial(baseColorTexture=tex,metallicFactor=0.0,roughnessFactor=.72,doubleSided=False)
mesh.visual=TextureVisuals(uv=np.array(uvs),material=mat)
scene=trimesh.Scene()
scene.add_geometry(mesh,geom_name='granny_smith_apple')
# short cinnamon-brown stem, center well is at y~0.77
stem=trimesh.creation.cone(radius=.052,height=.235,sections=14)
# cone axis along +Z; turn onto Y and put its lower end near y=.77
stem.apply_transform(trimesh.transformations.rotation_matrix(-math.pi/2,[1,0,0]))
stem.apply_translation([.0,.91,.01])
stem.visual.material=PBRMaterial(baseColorFactor=[77,54,30,255],metallicFactor=0,roughnessFactor=.95)
scene.add_geometry(stem,geom_name='stem')
# natural offset leaf (small and less prominent; matches the photo without cartoon look)
leaf_vertices=np.array([[.015,1.05,0.015],[.15,1.17,.025],[.29,1.20,.00],[.18,1.09,-.012],[.15,1.14,.035]],float)
leaf_faces=[[0,1,4],[1,2,4],[2,3,4],[3,0,4]]
leaf=trimesh.Trimesh(vertices=leaf_vertices,faces=leaf_faces,process=False)
leaf.visual.material=PBRMaterial(baseColorFactor=[73,114,32,255],roughnessFactor=.85,doubleSided=True)
scene.add_geometry(leaf,geom_name='leaf')
out=assets/'green-apple.glb'
out.write_bytes(scene.export(file_type='glb'))
print('GLB',out,out.stat().st_size)
