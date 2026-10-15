"""Offline orthographic render of exported engine geometry, without a browser.

This is a geometry/texture QA render, not a screenshot of the hosted app. No
shader wrinkles, normal maps, WebGL lighting or browser performance are tested.
Usage: render-qa.py SCENE.json OUTPUT.png [yaw-radians]
"""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

scene=json.loads(Path(sys.argv[1]).read_text())
yaw=float(sys.argv[3]) if len(sys.argv)>3 else 0
W,H=600,900
height=scene['b']['height']/100
scale=760/height
image=np.zeros((H,W,3),dtype=np.uint8);image[:]=[235,233,228]
depth=np.full((H,W),-np.inf)
c,s=np.cos(yaw),np.sin(yaw)
rotation=np.array([[c,0,s],[0,1,0],[-s,0,c]])
for mesh in scene['meshes']:
    p=np.array(mesh['positions']).reshape(-1,3)@rotation.T
    idx=np.array(mesh['index']).reshape(-1,3)
    uv=np.array(mesh.get('uv',[])).reshape(-1,2)
    texture=None
    if mesh.get('texture'):
        texture=np.array(Image.open(mesh['texture']).convert('RGB'))
    normals=np.zeros_like(p)
    face=np.cross(p[idx[:,1]]-p[idx[:,0]],p[idx[:,2]]-p[idx[:,0]])
    for j in range(3):np.add.at(normals,idx[:,j],face)
    normals/=np.maximum(1e-9,np.linalg.norm(normals,axis=1)[:,None])
    light=np.array([-.4,.7,1.]);light/=np.linalg.norm(light)
    shades=.48+.52*np.maximum(0,normals@light)
    screen=np.stack([W/2+p[:,0]*scale,H-60-p[:,1]*scale],1)
    color=np.array(mesh.get('color',[230,230,230]))
    for tri in idx:
        q=screen[tri];minx,maxx=max(0,int(np.floor(q[:,0].min()))),min(W-1,int(np.ceil(q[:,0].max())))
        miny,maxy=max(0,int(np.floor(q[:,1].min()))),min(H-1,int(np.ceil(q[:,1].max())))
        if minx>maxx or miny>maxy:continue
        a,b,d=q;det=(b[1]-d[1])*(a[0]-d[0])+(d[0]-b[0])*(a[1]-d[1])
        if abs(det)<1e-8:continue
        xx,yy=np.meshgrid(np.arange(minx,maxx+1)+.5,np.arange(miny,maxy+1)+.5)
        u=((b[1]-d[1])*(xx-d[0])+(d[0]-b[0])*(yy-d[1]))/det
        v=((d[1]-a[1])*(xx-d[0])+(a[0]-d[0])*(yy-d[1]))/det;w=1-u-v
        z=u*p[tri[0],2]+v*p[tri[1],2]+w*p[tri[2],2]
        region=depth[miny:maxy+1,minx:maxx+1];mask=(u>=0)&(v>=0)&(w>=0)&(z>region)
        if not mask.any():continue
        shade=u*shades[tri[0]]+v*shades[tri[1]]+w*shades[tri[2]]
        rgb=np.broadcast_to(color,(*u.shape,3))
        if texture is not None and len(uv):
            coords=u[...,None]*uv[tri[0]]+v[...,None]*uv[tri[1]]+w[...,None]*uv[tri[2]]
            tx=np.clip((coords[...,0]*(texture.shape[1]-1)).astype(int),0,texture.shape[1]-1)
            ty=np.clip(((1-coords[...,1])*(texture.shape[0]-1)).astype(int),0,texture.shape[0]-1)
            rgb=texture[ty,tx]
        pixels=np.clip(rgb*shade[...,None],0,255).astype(np.uint8)
        image[miny:maxy+1,minx:maxx+1][mask]=pixels[mask];region[mask]=z[mask]
Image.fromarray(image).save(sys.argv[2])
