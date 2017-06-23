import assert from 'power-assert';

export function GetWebGL2Context(canvas) {
    const gl = canvas.getContext('webgl2');
    assert.ok(gl);
    return gl;
}

export function CreateStaticVbo(gl, data) {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vbo;
}

const SQUARE = [
    -1, -1,
    -1, 1,
    1, -1,
    1, 1,
];

export function CreateSquareVbo(gl) {
    return CreateStaticVbo(gl, SQUARE);
}

export function LinkProgram(gl, program) {
    gl.linkProgram(program);
    assert.ok(gl.getProgramParameter(program, gl.LINK_STATUS),
              'Link Program Error');
    gl.useProgram(program);
}

export function AttachShader(gl, shaderStr, program, shaderType) {
    const shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderStr);
    gl.compileShader(shader);
    assert.ok(gl.getShaderParameter(shader, gl.COMPILE_STATUS),
             `Shader Compilation Error\n${gl.getShaderInfoLog(shader)}`);
    gl.attachShader(program, shader);
}
