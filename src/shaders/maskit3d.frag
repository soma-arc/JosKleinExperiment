#version 300 es
precision mediump float;

const int MAX_ORBIT_POINTS = 20;
struct Maskit {
    vec2 uv;
    float k;
    vec2 symmetricalPoint;
    vec2 lineLeftNormal;
    vec4 lineLeftPoints; // [below, above]
    vec2 lineRightNormal;
    vec4 lineRightPoints;
    vec4 inversionCircle;
    vec3 ui; // [point radius, line width, circumference width]
    bool drawLines;
    bool drawCircle;
    bool drawInner;
    bool applyInversion;
    bool trackOrbit;
    vec2 orbitPoints[MAX_ORBIT_POINTS];
};

uniform vec2 u_resolution;
uniform vec3 u_geometry; // [translateX, translateY, scale]
uniform vec3 u_cameraPos;
uniform vec3 u_cameraTarget;
uniform vec3 u_cameraUp;
uniform int u_kleinIterations;
uniform Maskit u_maskit;

const vec3 BLACK = vec3(0, 0, 0.0);
const vec3 WHITE = vec3(1);
const vec3 RED = vec3(0.8, 0, 0);
const vec3 GREEN = vec3(0, 0.8, 0);
const vec3 BLUE = vec3(0, 0, 0.8);
const vec3 YELLOW = vec3(1, 1, 0);
const vec3 PINK = vec3(.78, 0, .78);
const vec3 LIGHT_BLUE = vec3(0, 1, 1);

const float OBJ_KLEIN = 0.;
const float OBJ_PLANE = 1.;

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

bool intersectBox(vec3 rayOrg, vec3 rayDir, vec3 boxMin, vec3 boxMax,
                  out float hit0, out float hit1, out bool inBox) {
	float t0 = -1000000.0, t1 = 1000000.0;
    hit0 = t0;
    hit1 = t1;
    inBox = false;
    vec3 tNear = (boxMin - rayOrg) / rayDir;
    vec3 tFar  = (boxMax - rayOrg) / rayDir;
    
    if (tNear.x > tFar.x) {
        float tmp = tNear.x;
        tNear.x = tFar.x;
        tFar.x = tmp;
    }
    
    t0 = max(tNear.x, t0);
    t1 = min(tFar.x, t1);

    
    if (tNear.y > tFar.y) {
        float tmp = tNear.y;
        tNear.y = tFar.y;
        tFar.y = tmp;
    }
    t0 = max(tNear.y, t0);
    t1 = min(tFar.y, t1);

    if (tNear.z > tFar.z) {
        float tmp = tNear.z;
        tNear.z = tFar.z;
        tFar.z = tmp;
    }
    t0 = max(tNear.z, t0);
    t1 = min(tFar.z, t1);

    if (t0 <= t1 && 0. < t1) {
        if(t0 < 0.) inBox = true;
        hit0 = t0;
        hit1 = t1;
        return true;
    }
    return false;
}

vec3 calcRay (const vec3 eye, const vec3 target, const vec3 up, const float fov,
              const vec2 resolution, const vec2 coord){
    float imagePlane = (resolution.y * .5) / tan(fov * .5);
    vec3 v = normalize(target - eye);
    vec3 xaxis = normalize(cross(v, up));
    vec3 yaxis =  normalize(cross(v, xaxis));
    vec3 center = v * imagePlane;
    vec3 origin = center - (xaxis * (resolution.x  *.5)) - (yaxis * (resolution.y * .5));
    return normalize(origin + (xaxis * coord.x) + (yaxis * (resolution.y - coord.y)));
}

float lineY(vec2 pos, vec2 uv){
	return uv.x * .5 + sign(uv.y * .5) * (2.*uv.x-1.95)/4. * sign(pos.x + uv.y * 0.5)* (1. - exp(-(7.2-(1.95-uv.x)*15.)* abs(pos.x + uv.y * 0.5)));
}

vec3 TransA(vec3 z, vec2 uv, inout float dr){
	float iR = 1. / dot(z, z);
	z *= -iR;
	z.x = -uv.y - z.x;
    z.y = uv.x + z.y;
    dr *= iR;
    return z;
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec4 distPlane(vec3 p, vec4 n) {
    return vec4(OBJ_PLANE, dot(p, n.xyz) + n.w, 0, 0);
}

const int LOOP_NUM = 20;
vec4 JosKleinian(vec3 pos, const vec2 uv, const float translation) {
    float loopNum = 0.;
    vec3 lz = pos + vec3(1.);
    vec3 llz = pos + vec3(-1.);
    float numTransA = 0.;
    float dr = 1.;

    for(int i = 0 ; i < LOOP_NUM ; i++){
        // translate
    	pos.x += translation/2. + (uv.y * pos.y) / uv.x;
        pos.x = mod(pos.x, translation);
        pos.x -= translation/2. + (uv.y * pos.y) / uv.x;

        // rotate 180
        if (pos.y >= lineY(pos.xy, uv.xy)){
            // pos -= vec2(-uv.y, uv.x) * .5;
            // pos = - pos;
            // pos += vec2(-uv.y, uv.x) * .5;
            // |
            pos = vec3(-uv.y, uv.x, 0) - pos;
            //loopNum++;
        }

        pos = TransA(pos, uv, dr);
        loopNum++;

        // 2-cycle
        if(dot(pos-llz,pos-llz) < 1e-6) break;

        llz=lz; lz=pos;
    }

    float y =  min(pos.y, uv.x - pos.y) ;
    float d = 9999999.;
	d = min(d, min(y, 0.3) / max(dr, 2.));
    const float scalingFactor = 0.5;
    return vec4(OBJ_KLEIN, d * scalingFactor, loopNum, numTransA);
}

vec4 opUnion(vec4 d1, vec4 d2) {
    return d1.y < d2.y ? d1 : d2;
}
    

// return [objId, distance, data, data]
vec4 distFunc(const vec3 p){
    vec4 d = distPlane(p, vec4(0, 1, 0, -0.001));
    return (JosKleinian(p, u_maskit.uv, u_maskit.k));
}

const vec2 NORMAL_COEFF = vec2(0.01, 0.);
vec3 computeNormal(const vec3 p) {
    return normalize(vec3(distFunc(p + NORMAL_COEFF.xyy).y - distFunc(p - NORMAL_COEFF.xyy).y,
                          distFunc(p + NORMAL_COEFF.yxy).y - distFunc(p - NORMAL_COEFF.yxy).y,
                          distFunc(p + NORMAL_COEFF.yyx).y - distFunc(p - NORMAL_COEFF.yyx).y));
}

const float EPSILON = 0.001;
const int MAX_MARCHING_LOOP = 500;
vec4 march (const vec3 rayOrg, const vec3 rayDir,
            const float t0, const float t1,
            inout vec3 intersection, inout vec3 normal) {
    vec3 rayPos = rayOrg + rayDir * t0;
    vec4 dist = vec4(-1);
    float rayLength = t0;
    for(int i = 0 ; i < MAX_MARCHING_LOOP ; i++){
        if(rayLength > t1) break;
        dist = distFunc(rayPos);
        rayLength += dist.y;
        rayPos = rayOrg + rayDir * rayLength;
        if(dist.y < EPSILON) {
            intersection = rayPos;
            normal = computeNormal(intersection);
            dist.y = rayLength;
            return dist; // [objId, distance from rayOrigin, data, data]
        }
    }
    return vec4(-1);
}

float computeShadowFactor (const vec3 rayOrg, const vec3 rayDir,
                           const float mint, const float maxt, const float k) {
    float shadowFactor = 1.0;
    for(float t = mint ; t < maxt ;){
        float d = distFunc(rayOrg + rayDir * t).y;
        if(d < EPSILON) {
            shadowFactor = 0.;
            break;
        }

        shadowFactor = min(shadowFactor, k * d / t);
        t += d;
    }
    return clamp(shadowFactor, 0.0, 1.0);
}

vec3 computeColor(float n){
	return hsv2rgb(vec3(.3 +0.06 * n, 1., .7));
}

const vec3 AMBIENT_FACTOR = vec3(0.1);
const vec3 LIGHT_DIR = normalize(vec3(1, .8, 1));
vec3 calcColor(vec3 rayOrg, vec3 rayDir) {
    float minDist = 9999999.;
    vec3 intersection, normal;
    vec3 color = vec3(0);

    float hit0, hit1;
    bool inBox;
    bool hit = intersectBox(rayOrg, rayDir,
                            vec3(-999, -999, -0.6), vec3(999., 999., 0.6),
                            hit0, hit1, inBox);
    hit0 = (inBox) ? 0. : hit0;

    vec4 hitInfo = vec4(-1);
    if(hit){    
        hitInfo = march(rayOrg, rayDir, hit0, hit1,
                        intersection, normal);
    }
    
    if(hitInfo.x != -1.) {
        vec3 matColor;
        float k = 1.;
        if(hitInfo.x == OBJ_KLEIN) {
            matColor = computeColor(hitInfo.z);
            //matColor = normal;
            k = 1.;
            k = computeShadowFactor(intersection + 0.01 * normal, LIGHT_DIR,
                                    0.1, 1., 30.);
        } else if(hitInfo.x == OBJ_PLANE) {
            matColor = normal;//vec3(0.7);
            k = computeShadowFactor(intersection + 0.01 * normal, LIGHT_DIR,
                                    0.1, .5, 2.);
        }

        vec3 diffuse =  clamp(dot(normal, LIGHT_DIR), 0., 1.) * matColor;
        vec3 ambient = matColor * AMBIENT_FACTOR;
        color = (diffuse * k + ambient);
    }
    //color = mix( vec3(0.6, 0.7, 1.0), color, exp( -0.01 * minDist * minDist) );
    return color;
}

const float SAMPLE_NUM = 1.;
out vec4 outColor;
void main() {
    const float fov = radians(60.);
    vec3 sum = vec3(0);
    for(float i = 0. ; i < SAMPLE_NUM ; i++){
        vec2 coordOffset = rand2n(gl_FragCoord.xy, i);
        vec3 ray = calcRay(u_cameraPos, u_cameraTarget, u_cameraUp, fov,
                           u_resolution,
                           gl_FragCoord.xy + coordOffset);

        sum += calcColor(u_cameraPos, ray);
    }
    outColor = vec4(gammaCorrect(sum/SAMPLE_NUM), 1.);
}
