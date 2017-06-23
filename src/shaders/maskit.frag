#version 300 es
precision mediump float;

struct Maskit {
    vec2 uv;
    float k;
    vec2 lineLeftNormal;
    vec4 lineLeftPoints; // [below, above]
    vec2 lineRightNormal;
    vec4 lineRightPoints;
    vec2 ui; // [point radius, line width]
};

uniform vec2 u_resolution;
uniform vec3 u_geometry; // [translateX, translateY, scale]
uniform int u_kleinIterations;
uniform Maskit u_maskit;

// from Syntopia http://blog.hvidtfeldts.net/index.php/2015/01/path-tracing-3d-fractals/
vec2 rand2n(vec2 co, float sampleIndex) {
    vec2 seed = co * (sampleIndex + 1.0);
	seed+=vec2(-1,1);
    // implementation based on: lumina.sourceforge.net/Tutorials/Noise.html
    return vec2(fract(sin(dot(seed.xy ,vec2(12.9898,78.233))) * 43758.5453),
                fract(cos(dot(seed.xy ,vec2(4.898,7.23))) * 23421.631));
}

const float GAMMA_COEFF = 2.2;
const float DISPLAY_GAMMA_COEFF = 1. / GAMMA_COEFF;
vec3 gammaCorrect(vec3 rgb) {
  return vec3((min(pow(rgb.r, DISPLAY_GAMMA_COEFF), 1.)),
              (min(pow(rgb.g, DISPLAY_GAMMA_COEFF), 1.)),
              (min(pow(rgb.b, DISPLAY_GAMMA_COEFF), 1.)));
}

vec3 degamma(vec3 rgb) {
  return vec3((min(pow(rgb.r, GAMMA_COEFF), 1.)),
              (min(pow(rgb.g, GAMMA_COEFF), 1.)),
              (min(pow(rgb.b, GAMMA_COEFF), 1.)));
}

float lineY(vec2 pos, vec2 uv){
	return uv.x * .5 + sign(uv.y * .5) * (2.*uv.x-1.95)/4. * sign(pos.x + uv.y * 0.5)* (1. - exp(-(7.2-(1.95-uv.x)*15.)* abs(pos.x + uv.y * 0.5)));
}

vec2 TransA(vec2 z, vec2 uv){
	float iR = 1. / dot(z, z);
	z *= -iR;
	z.x = -uv.y - z.x; z.y = uv.x + z.y;
    return z;
}

vec2 TransAInv(vec2 z, vec2 uv){
	float iR = 1. / dot(z + vec2(uv.y,-uv.x), z + vec2(uv.y, -uv.x));
	z.x += uv.y; z.y = uv.x - z.y; 
	z *= iR;
    return z;
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 computeColor(float n){
	return hsv2rgb(vec3(.3 +0.06 * n, 1., .7));
}

const int LOOP_NUM = 150;
vec3 josKleinian(vec2 pos, vec2 uv, float translation){
    // draw line3
    //if(abs(pos.y - lineY(pos, uv.xy)) < .01) return vec3(1);
    
    float loopNum = 0.;
    if(pos.y <= 0. || uv.x < pos.y) {
    	return computeColor(loopNum);
    }
    vec2 lz = pos + vec2(1.);
    vec2 llz = pos + vec2(-1.);

    
    vec2 catPos1 = vec2(1.5, 1.);
    vec2 catPos2 = catPos1 - vec2(4., 0.);

    for(int i = 0 ; i < LOOP_NUM ; i++){
        // translate
    	pos.x += translation/2. + (uv.y * pos.y) / uv.x;
        pos.x = mod(pos.x, translation);
        pos.x -= translation/2. + (uv.y * pos.y) / uv.x;
        
        // rotate 180
        if (pos.y >= lineY(pos, uv.xy)){
            // pos -= vec2(-uv.y, uv.x) * .5;
            // pos = - pos;
            // pos += vec2(-uv.y, uv.x) * .5;
            // |
            pos = vec2(-uv.y, uv.x) - pos;
            //loopNum++;
        }
        
        pos = TransA(pos, uv);
        
        loopNum++;
        
        // 2-cycle
        if(dot(pos-llz,pos-llz) < 1e-6) return vec3(0);

        if(pos.y <= 0. || uv.x < pos.y) {
        	return computeColor(loopNum);
        }
        llz=lz; lz=pos;
    }
    return vec3(0.);
}

float SAMPLE_NUM = 10.;
out vec4 outColor;
void main() {
    vec3 sum = vec3(0);
	float ratio = u_resolution.x / u_resolution.y / 2.0;
    
    for(float i = 0. ; i < SAMPLE_NUM ; i++){
        vec2 position = ( (gl_FragCoord.xy + (rand2n(gl_FragCoord.xy, i))) / u_resolution.yy ) - vec2(ratio, 0.5);
        position *= u_geometry.z;
        position += u_geometry.xy;
        
        sum += josKleinian(position, u_maskit.uv, u_maskit.k);

    }
    outColor = vec4(gammaCorrect(sum/SAMPLE_NUM), 1.);
}
