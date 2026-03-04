interface BackgroundBase {
  name: string;
  type: string;
  link?: string;
  license?: string;
  author?: {
    name: string;
    link?: string;
  };
}

interface ShaderBackground extends BackgroundBase {
  type: 'shader';
  fs: string;
}

type Background = ShaderBackground;

export const backgrounds = {
  rainbow: {
    name: 'Rainbow',
    type: 'shader',
    fs: `
        void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
            vec2 uv = fragCoord/iResolution.xy;
            vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
            fragColor = vec4(col,1.0);
        }
        `,
  },
  jimbo: {
    name: 'Jimbo',
    type: 'shader',
    link: 'https://www.shadertoy.com/view/XXtBRr',
    license: 'CC BY-NC-SA 3.0',
    author: {
      name: 'xxidbr9',
      link: 'https://www.shadertoy.com/user/xxidbr9',
    },
    fs: `
            // Original by localthunk (https://www.playbalatro.com)

            // Configuration (modify these values to change the effect)
            #define SPIN_ROTATION -2.0
            #define SPIN_SPEED 7.0
            #define OFFSET vec2(0.0)
            #define COLOUR_1 vec4(0.871, 0.267, 0.231, 1.0)
            #define COLOUR_2 vec4(0.0, 0.42, 0.706, 1.0)
            #define COLOUR_3 vec4(0.086, 0.137, 0.145, 1.0)
            #define CONTRAST 3.5
            #define LIGTHING 0.4
            #define SPIN_AMOUNT 0.25
            #define PIXEL_FILTER 745.0
            #define SPIN_EASE 1.0
            #define PI 3.14159265359
            #define IS_ROTATE false

            vec4 effect(vec2 screenSize, vec2 screen_coords) {
                float pixel_size = length(screenSize.xy) / PIXEL_FILTER;
                vec2 uv = (floor(screen_coords.xy*(1./pixel_size))*pixel_size - 0.5*screenSize.xy)/length(screenSize.xy) - OFFSET;
                float uv_len = length(uv);
                
                float speed = (SPIN_ROTATION*SPIN_EASE*0.2);
                if(IS_ROTATE){
                speed = iTime * speed;
                }
                speed += 302.2;
                float new_pixel_angle = atan(uv.y, uv.x) + speed - SPIN_EASE*20.*(1.*SPIN_AMOUNT*uv_len + (1. - 1.*SPIN_AMOUNT));
                vec2 mid = (screenSize.xy/length(screenSize.xy))/2.;
                uv = (vec2((uv_len * cos(new_pixel_angle) + mid.x), (uv_len * sin(new_pixel_angle) + mid.y)) - mid);
                
                uv *= 30.;
                speed = iTime*(SPIN_SPEED);
                vec2 uv2 = vec2(uv.x+uv.y);
                
                for(int i=0; i < 5; i++) {
                    uv2 += sin(max(uv.x, uv.y)) + uv;
                    uv  += 0.5*vec2(cos(5.1123314 + 0.353*uv2.y + speed*0.131121),sin(uv2.x - 0.113*speed));
                    uv  -= 1.0*cos(uv.x + uv.y) - 1.0*sin(uv.x*0.711 - uv.y);
                }
                
                float contrast_mod = (0.25*CONTRAST + 0.5*SPIN_AMOUNT + 1.2);
                float paint_res = min(2., max(0.,length(uv)*(0.035)*contrast_mod));
                float c1p = max(0.,1. - contrast_mod*abs(1.-paint_res));
                float c2p = max(0.,1. - contrast_mod*abs(paint_res));
                float c3p = 1. - min(1., c1p + c2p);
                float light = (LIGTHING - 0.2)*max(c1p*5. - 4., 0.) + LIGTHING*max(c2p*5. - 4., 0.);
                return (0.3/CONTRAST)*COLOUR_1 + (1. - 0.3/CONTRAST)*(COLOUR_1*c1p + COLOUR_2*c2p + vec4(c3p*COLOUR_3.rgb, c3p*COLOUR_1.a)) + light;
            }

            void mainImage(out vec4 fragColor, in vec2 fragCoord) {
                vec2 uv = fragCoord/iResolution.xy;
                
                fragColor = effect(iResolution.xy, uv * iResolution.xy);
            }
        `,
  },
  vortex: {
    name: 'Vortex',
    type: 'shader',
    link: 'https://www.shadertoy.com/view/wcyBD3',
    license: 'CC BY-NC-SA 4.0',
    author: {
      name: 'Frostbyte_',
      link: 'https://www.shadertoy.com/user/Frostbyte_',
    },
    fs: `
            // Shader by Frostbyte
            // Licensed under CC BY-NC-SA 4.0

            /*
            Only 10 Raymarch Steps! Other looks can be found with as few as 5 steps.
            This shader was influenced by Xor's Surf 2, but created using a different technique.
            Xor's Surf 2: https://www.shadertoy.com/view/3fKSzc
            Methods were drawn from my Abstract Series: https://www.shadertoy.com/playlist/D3VBDt
            In this series, I aimed for creativity with low raymarch count volumetrics.
            Many looks can be found with a few adjustments but the low ray march count makes it tricky and interesting.
            One of the challenges is creating depth with the lower raymarch count. 
            Accumulated glow/HDR is reduced. Less steps are taken along z and the distance along z is reduced.
            Ways I added percieved depth here is through movement, turbulence, 
            color contrast of background, volumetric glow, and color variation along length(p.xy).

            Notes: 
            Aces tonemap > Tanh for higher contrast look in this scene.
            Dot noise - volume that we are moving through.
            Clear Tunnel for "Camera": 2.-length(p.xy)
            Turbulent Effect: s+=abs(sin(p.z)); - Movement along z creates turbulent effect
            Color like "Luminence": 1.+sin(i))/s; - s gives glow and sin(i) gives iterative color for each raymarch 
            Volumetrics: p+=d*s; Accumulate along each step of d
            */

            //2d rotation matrix
            vec2 r(vec2 v,float t){float s=sin(t),c=cos(t);return mat2(c,-s,s,c)*v;}

            // ACES tonemap: https://www.shadertoy.com/view/Xc3yzM
            vec3 a(vec3 c)
            {
            mat3 m1=mat3(0.59719,0.07600,0.02840,0.35458,0.90834,0.13383,0.04823,0.01566,0.83777);
            mat3 m2=mat3(1.60475,-0.10208,-0.00327,-0.53108,1.10813,-0.07276,-0.07367,-0.00605,1.07602);
            vec3 v=m1*c,a=v*(v+0.0245786)-0.000090537,b=v*(0.983729*v+0.4329510)+0.238081;
            return m2*(a/b);
            }

            //Xor's Dot Noise: https://www.shadertoy.com/view/wfsyRX
            float n(vec3 p)
            {
                const float PHI = 1.618033988;
                const mat3 GOLD = mat3(
                -0.571464913, +0.814921382, +0.096597072,
                -0.278044873, -0.303026659, +0.911518454,
                +0.772087367, +0.494042493, +0.399753815);
                return dot(cos(GOLD * p), sin(PHI * p * GOLD));
            }

            void mainImage(out vec4 o,in vec2 u){
                float s,t=iTime;
                vec3 p=vec3(0.,0.,t),l=vec3(0.),b,d;
                d=normalize(vec3(2.*u-iResolution.xy,iResolution.y));
                o=vec4(0.,0.,0.,1.);
                for(float i=0.;i<10.;i++){
                    b=p;
                    b.xy=r(sin(b.xy),t*1.5+b.z*3.);
                    s=.001+abs(n(b*12.)/12.-n(b))*.4;
                    s=max(s,2.-length(p.xy));
                    s+=abs(p.y*.75+sin(p.z+t*.1+p.x*1.5))*.2;
                    p+=d*s;
                    l+=(1.+sin(i+length(p.xy*.1)+vec3(3,1.5,1)))/s;
                }
                o.rgb=a(l*l/6e2);   
            }

        `,
  },
  bioscanner: {
    name: 'Bioscanner',
    type: 'shader',
    link: 'https://www.shadertoy.com/view/7ltXWf',
    license: 'CC BY-NC-SA 3.0',
    author: {
      name: 'R3N',
      link: 'https://www.shadertoy.com/user/R3N',
    },
    fs: `
            #extension GL_OES_standard_derivatives : enable
            #define pi 3.14159
            #define oz vec2(1,0)

            // random [0,1]
            float hash12(vec2 p) {
              vec3 p3  = fract(vec3(p.xyx) * .1031);
              p3 += dot(p3, p3.yzx + 33.33);
              return fract((p3.x + p3.y) * p3.z);
            }

            // random normalized vector
            vec2 randVec(vec2 p) {
              float a = hash12(p);
              a *= 2.0*pi;
              a += iTime;
              return vec2(sin(a), cos(a));
            }

            // perlin noise
            float perlin(vec2 p) {
              vec2 f = fract(p);
              vec2 s = smoothstep(0.0, 1.0, f);
              vec2 i = floor(p);
              float a = dot(randVec(i), f);
              float b = dot(randVec(i+oz.xy), f-oz.xy);
              float c = dot(randVec(i+oz.yx), f-oz.yx);
              float d = dot(randVec(i+oz.xx), f-oz.xx);
              return mix(mix(a, b, s.x), mix(c, d, s.x), s.y)/0.707107;
            }

            // fractal noise
            float fbm(vec2 p) {
              float a = 0.5;
              float r = 0.0;
              for (int i = 0; i < 8; i++) {
                r += a*perlin(p);
                a *= 0.5;
                p *= 2.0;
              }
              return r;
            }

            // 2D square sdf
            float square(vec2 p, vec2 s) {
              vec2 d = abs(p)-s;
              return length(max(d, 0.)) + min(0., max(d.x,d.y));
            }

            void mainImage(out vec4 fragColor, in vec2 fragCoord) {
              // coordinates
              vec2 uv = fragCoord.xy/iResolution.y;
              uv.y = 1.-uv.y;
              float ar = iResolution.x/iResolution.y;
              uv -= vec2(ar/2.0,0.5);
              float uxy = uv.x+uv.y;
              // distortion noise
              float n = fbm(vec2(10.*uv.y, 3.*iTime));
              float g = 0.2*n-0.6+sin(0.3*iTime);
              uv.x += smoothstep(0.15, 0., abs(g))*n;
              // wave
              float s = perlin(vec2(0.3*iTime));
              vec2 p = vec2(perlin(vec2(0.5*iTime)), 0.5*perlin(vec2(-iTime)))*0.5*(iResolution.xy - vec2(300, 300))/iResolution.y;
              p.y -= 0.1*sin(6.*p.x+iTime);
                vec2 m = (vec2(iMouse.x/iResolution.x, 1.-iMouse.y/iResolution.y)-0.5);
                m.x = clamp(ar*m.x, -ar*0.35, ar*0.35);
                m.y = clamp(m.y, -0.25, 0.25);
                p = iMouse.z > 0.5 ? m : p;
              float a = smoothstep(-0.5, -0.1, s)*smoothstep(mix(0.01, 0.9, smoothstep(-0.5, 0.5, s)), 0., length(uv-p));
                float r = 0.;
              for (float i = 1.; i <= 8.; i++) {
                float f = uv.y;
                f += 0.2*sin(5.*uv.x+iTime+a*sin(i+iTime)*1.25*cos(5.*uv.x+0.5*i));
                r += 0.003/abs(f);
              }
              // ui
              float ob = square(uv, 0.5*vec2(0.9*ar,1.-0.1*ar));
              float ui = 1.5*smoothstep(fwidth(uxy), -fwidth(uxy), abs(ob));
              float ms = step(ob, -0.005) * smoothstep(0.01, 0.005, abs(abs(uv.y)-0.475*(1.-0.1*ar)));
              ms *= smoothstep(2.*fwidth(uv.x), fwidth(uv.x), fract(uv.x*100.)/100.);
              ui = max(ui, ms);
              float cr = smoothstep(fwidth(uxy), 0., abs(min(abs(uv.x-p.x), abs(uv.y-p.y))));
              cr = max(cr, 3.*smoothstep(fwidth(uxy), -fwidth(uxy), abs(square(uv-p, (0.1+smoothstep(-0.25, 0.5, s))*vec2(0.15)))));
              cr *= smoothstep(0., -0.1, ob);
              ui = max(ui, cr);
              r = max(r, 2.*ui);
              r *= 2.*pow(0.5+0.5*n, 2.);
              r *= 0.5+0.5*hash12(fragCoord.xy+iTime);
              r = clamp(r, 0., 1.);
              fragColor = vec4(mix(r, pow(1.-r, 3.), smoothstep(-0.025, 0.025, g)));
            }
        `,
  },
  starNest: {
    name: 'Star Nest',
    type: 'shader',
    link: 'https://www.shadertoy.com/view/XlfGRj',
    license: 'MIT',
    author: {
      name: 'Kali',
      link: 'https://www.shadertoy.com/user/Kali',
    },
    fs: `
            // Star Nest by Pablo Roman Andrioli
            // License: MIT

            #define iterations 17
            #define formuparam 0.53

            #define volsteps 20
            #define stepsize 0.1

            #define zoom   0.800
            #define tile   0.850
            #define speed  0.010 

            #define brightness 0.0015
            #define darkmatter 0.300
            #define distfading 0.730
            #define saturation 0.850


            void mainImage( out vec4 fragColor, in vec2 fragCoord )
            {
              //get coords and direction
              vec2 uv=fragCoord.xy/iResolution.xy-.5;
              uv.y*=iResolution.y/iResolution.x;
              vec3 dir=vec3(uv*zoom,1.);
              float time=iTime*speed+.25;

              //mouse rotation
              float a1=.5+iMouse.x/iResolution.x*2.;
              float a2=.8+iMouse.y/iResolution.y*2.;
              mat2 rot1=mat2(cos(a1),sin(a1),-sin(a1),cos(a1));
              mat2 rot2=mat2(cos(a2),sin(a2),-sin(a2),cos(a2));
              dir.xz*=rot1;
              dir.xy*=rot2;
              vec3 from=vec3(1.,.5,0.5);
              from+=vec3(time*2.,time,-2.);
              from.xz*=rot1;
              from.xy*=rot2;
              
              //volumetric rendering
              float s=0.1,fade=1.;
              vec3 v=vec3(0.);
              for (int r=0; r<volsteps; r++) {
                vec3 p=from+s*dir*.5;
                p = abs(vec3(tile)-mod(p,vec3(tile*2.))); // tiling fold
                float pa,a=pa=0.;
                for (int i=0; i<iterations; i++) { 
                  p=abs(p)/dot(p,p)-formuparam; // the magic formula
                  a+=abs(length(p)-pa); // absolute sum of average change
                  pa=length(p);
                }
                float dm=max(0.,darkmatter-a*a*.001); //dark matter
                a*=a*a; // add contrast
                if (r>6) fade*=1.-dm; // dark matter, don't render near
                //v+=vec3(dm,dm*.5,0.);
                v+=fade;
                v+=vec3(s,s*s,s*s*s*s)*a*brightness*fade; // coloring based on distance
                fade*=distfading; // distance fading
                s+=stepsize;
              }
              v=mix(vec3(length(v)),v,saturation); //color adjust
              fragColor = vec4(v*.01,1.);	
              
            }
        `,
  },
  auroras: {
    name: 'Auroras',
    type: 'shader',
    link: 'https://www.shadertoy.com/view/XtGGRt',
    license: 'CC BY-NC-SA 3.0',
    author: {
      name: 'nimitz',
      link: 'https://www.shadertoy.com/user/nimitz',
    },
    fs: `
      // Auroras by nimitz 2017 (twitter: @stormoid)
      // License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
      // Contact the author for other licensing options

      /*
        
        There are two main hurdles I encountered rendering this effect. 
        First, the nature of the texture that needs to be generated to get a believable effect
        needs to be very specific, with large scale band-like structures, small scale non-smooth variations
        to create the trail-like effect, a method for animating said texture smoothly and finally doing all
        of this cheaply enough to be able to evaluate it several times per fragment/pixel.

        The second obstacle is the need to render a large volume while keeping the computational cost low.
        Since the effect requires the trails to extend way up in the atmosphere to look good, this means
        that the evaluated volume cannot be as constrained as with cloud effects. My solution was to make
        the sample stride increase polynomially, which works very well as long as the trails are lower opcaity than
        the rest of the effect. Which is always the case for auroras.

        After that, there were some issues with getting the correct emission curves and removing banding at lowered
        sample densities, this was fixed by a combination of sample number influenced dithering and slight sample blending.

        N.B. the base setup is from an old shader and ideally the effect would take an arbitrary ray origin and
        direction. But this was not required for this demo and would be trivial to fix.
      */

      #define time iTime

      mat2 mm2(in float a){float c = cos(a), s = sin(a);return mat2(c,s,-s,c);}
      mat2 m2 = mat2(0.95534, 0.29552, -0.29552, 0.95534);
      float tri(in float x){return clamp(abs(fract(x)-.5),0.01,0.49);}
      vec2 tri2(in vec2 p){return vec2(tri(p.x)+tri(p.y),tri(p.y+tri(p.x)));}

      float triNoise2d(in vec2 p, float spd)
      {
          float z=1.8;
          float z2=2.5;
        float rz = 0.;
          p *= mm2(p.x*0.06);
          vec2 bp = p;
        for (float i=0.; i<5.; i++ )
        {
              vec2 dg = tri2(bp*1.85)*.75;
              dg *= mm2(time*spd);
              p -= dg/z2;

              bp *= 1.3;
              z2 *= .45;
              z *= .42;
          p *= 1.21 + (rz-1.0)*.02;
              
              rz += tri(p.x+tri(p.y))*z;
              p*= -m2;
        }
          return clamp(1./pow(rz*29., 1.3),0.,.55);
      }

      float hash21(in vec2 n){ return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }
      vec4 aurora(vec3 ro, vec3 rd)
      {
          vec4 col = vec4(0);
          vec4 avgCol = vec4(0);
          
          for(float i=0.;i<50.;i++)
          {
              float of = 0.006*hash21(gl_FragCoord.xy)*smoothstep(0.,15., i);
              float pt = ((.8+pow(i,1.4)*.002)-ro.y)/(rd.y*2.+0.4);
              pt -= of;
            vec3 bpos = ro + pt*rd;
              vec2 p = bpos.zx;
              float rzt = triNoise2d(p, 0.06);
              vec4 col2 = vec4(0,0,0, rzt);
              col2.rgb = (sin(1.-vec3(2.15,-.5, 1.2)+i*0.043)*0.5+0.5)*rzt;
              avgCol =  mix(avgCol, col2, .5);
              col += avgCol*exp2(-i*0.065 - 2.5)*smoothstep(0.,5., i);
              
          }
          
          col *= (clamp(rd.y*15.+.4,0.,1.));
          
          
          //return clamp(pow(col,vec4(1.3))*1.5,0.,1.);
          //return clamp(pow(col,vec4(1.7))*2.,0.,1.);
          //return clamp(pow(col,vec4(1.5))*2.5,0.,1.);
          //return clamp(pow(col,vec4(1.8))*1.5,0.,1.);
          
          //return smoothstep(0.,1.1,pow(col,vec4(1.))*1.5);
          return col*1.8;
          //return pow(col,vec4(1.))*2.
      }


      //-------------------Background and Stars--------------------

      vec3 nmzHash33(vec3 q)
      {
          vec3 p3 = fract(q * vec3(0.1031, 0.1030, 0.0973));
          p3 += dot(p3, p3.yxz + 33.33);
          return fract((p3.xxy + p3.yxx) * p3.zyx);
      }

      vec3 stars(in vec3 p)
      {
          vec3 c = vec3(0.);
          float res = iResolution.x*1.;
          
        for (float i=0.;i<4.;i++)
          {
              vec3 q = fract(p*(.15*res))-0.5;
              vec3 id = floor(p*(.15*res));
              vec2 rn = nmzHash33(id).xy;
              float c2 = 1.-smoothstep(0.,.6,length(q));
              c2 *= step(rn.x,.0005+i*i*0.001);
              c += c2*(mix(vec3(1.0,0.49,0.1),vec3(0.75,0.9,1.),rn.y)*0.1+0.9);
              p *= 1.3;
          }
          return c*c*.8;
      }

      vec3 bg(in vec3 rd)
      {
          float sd = dot(normalize(vec3(-0.5, -0.6, 0.9)), rd)*0.5+0.5;
          sd = pow(sd, 5.);
          vec3 col = mix(vec3(0.05,0.1,0.2), vec3(0.1,0.05,0.2), sd);
          return col*.63;
      }
      //-----------------------------------------------------------


      void mainImage( out vec4 fragColor, in vec2 fragCoord )
      {
        vec2 q = fragCoord.xy / iResolution.xy;
          vec2 p = q - 0.5;
        p.x*=iResolution.x/iResolution.y;
          
          vec3 ro = vec3(0,0,-6.7);
          vec3 rd = normalize(vec3(p,1.3));
          vec2 mo = iMouse.xy / iResolution.xy-.5;
          mo = (mo==vec2(-.5))?mo=vec2(-0.1,0.1):mo;
        mo.x *= iResolution.x/iResolution.y;
          rd.yz *= mm2(mo.y);
          rd.xz *= mm2(mo.x + sin(time*0.05)*0.2);
          
          vec3 col = vec3(0.);
          vec3 brd = rd;
          float fade = smoothstep(0.,0.01,abs(brd.y))*0.1+0.9;
          
          col = bg(rd)*fade;
          
          if (rd.y > 0.){
              vec4 aur = smoothstep(0.,1.5,aurora(ro,rd))*fade;
              col += stars(rd);
              col = col*(1.-aur.a) + aur.rgb;
          }
          else //Reflections
          {
              rd.y = abs(rd.y);
              col = bg(rd)*fade*0.6;
              vec4 aur = smoothstep(0.0,2.5,aurora(ro,rd));
              col += stars(rd)*0.1;
              col = col*(1.-aur.a) + aur.rgb;
              vec3 pos = ro + ((0.5-ro.y)/rd.y)*rd;
              float nz2 = triNoise2d(pos.xz*vec2(.5,.7), 0.);
              col += mix(vec3(0.2,0.25,0.5)*0.08,vec3(0.3,0.3,0.5)*0.7, nz2*0.4);
          }
          
        fragColor = vec4(col, 1.);
      }

    `
  },
  gradientFlow: {
    name: 'Gradient Flow',
    type: 'shader',
    link: 'https://www.shadertoy.com/view/wdyczG',
    license: 'CC BY-NC-SA 3.0',
    author: {
      name: 'Inigo Quilez',
      link: 'https://www.shadertoy.com/view/wdyczG',
    },
    fs: `
      #define S(a,b,t) smoothstep(a,b,t)

      mat2 Rot(float a)
      {
          float s = sin(a);
          float c = cos(a);
          return mat2(c, -s, s, c);
      }


      // Created by inigo quilez - iq/2014
      // License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
      vec2 hash( vec2 p )
      {
          p = vec2( dot(p,vec2(2127.1,81.17)), dot(p,vec2(1269.5,283.37)) );
        return fract(sin(p)*43758.5453);
      }

      float noise( in vec2 p )
      {
          vec2 i = floor( p );
          vec2 f = fract( p );
        
        vec2 u = f*f*(3.0-2.0*f);

          float n = mix( mix( dot( -1.0+2.0*hash( i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ), 
                              dot( -1.0+2.0*hash( i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                        mix( dot( -1.0+2.0*hash( i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ), 
                              dot( -1.0+2.0*hash( i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
        return 0.5 + 0.5*n;
      }


      void mainImage( out vec4 fragColor, in vec2 fragCoord )
      {
          vec2 uv = fragCoord/iResolution.xy;
          float ratio = iResolution.x / iResolution.y;

          vec2 tuv = uv;
          tuv -= .5;

          // rotate with Noise
          float degree = noise(vec2(iTime*.1, tuv.x*tuv.y));

          tuv.y *= 1./ratio;
          tuv *= Rot(radians((degree-.5)*720.+180.));
        tuv.y *= ratio;

          
          // Wave warp with sin
          float frequency = 5.;
          float amplitude = 30.;
          float speed = iTime * 2.;
          tuv.x += sin(tuv.y*frequency+speed)/amplitude;
          tuv.y += sin(tuv.x*frequency*1.5+speed)/(amplitude*.5);
          
          
          // draw the image
          vec3 colorYellow = vec3(.957, .804, .623);
          vec3 colorDeepBlue = vec3(.192, .384, .933);
          vec3 layer1 = mix(colorYellow, colorDeepBlue, S(-.3, .2, (tuv*Rot(radians(-5.))).x));
          
          vec3 colorRed = vec3(.910, .510, .8);
          vec3 colorBlue = vec3(0.350, .71, .953);
          vec3 layer2 = mix(colorRed, colorBlue, S(-.3, .2, (tuv*Rot(radians(-5.))).x));
          
          vec3 finalComp = mix(layer1, layer2, S(.5, -.3, tuv.y));
          
          vec3 col = finalComp;
          
          fragColor = vec4(col,1.0);
      }
    `
  }
} as const satisfies Record<string, Background>;
