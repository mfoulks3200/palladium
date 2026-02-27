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
} as const satisfies Record<string, Background>;
