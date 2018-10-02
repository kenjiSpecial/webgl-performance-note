import vertexShaderSrc from './components/shaders/skybox/shader.vert.glsl';
import fragmentShaderSrc from './components/shaders/skybox/shader.frag.glsl';

import { Program } from 'tubugl-core/src/program';
import { mat4 } from 'gl-matrix/src/gl-matrix';
import { createSimpleBox } from '../vendors/utils/generator';
import { createEmptyCubemap } from '../vendors/utils/funcs';

export class SkyBox {
	/**
	 *
	 * @param {object} params
	 * @param {WebGLRenderingContext} params.gl
	 */
	constructor(params = {}) {
		this._gl = params.gl;

		this.createProgram();
		this.makeBuffer();
		this.createMatrix();
		this.getUniformLocation();

		this.captureView(params.sphereMesh);
	}

	createProgram() {
		const gl = this._gl;
		this._program = new Program(gl, vertexShaderSrc, fragmentShaderSrc);
	}

	captureView(sphereMesh) {
		const gl = this._gl;

		this._textures = [];

		let viewArray = [
			[[1, 0, 0], [0, -1, 0]],
			[[-1, 0, 0], [0, -1, 0]],
			[[0, 1, 0], [0, 0, 1]],
			[[0, -1, 0], [0, 0, -1]],
			[[0, 0, 1], [0, -1, 0]],
			[[0, 0, -1], [0, -1, 0]]
		];

		const targetTextureWidth = 2048;
		const targetTextureHeight = 2048;

		let viewMatrix = mat4.create();
		let projectionMatrix = mat4.create();
		const level = 0;
		const framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

		this._cubemap = createEmptyCubemap(gl, targetTextureWidth, targetTextureHeight);

		mat4.perspective(projectionMatrix, (90 / 180) * Math.PI, 1, 0.1, 10);

		for (let ii = 0; ii < viewArray.length; ii++) {
			mat4.lookAt(viewMatrix, [0, 0, 0], viewArray[ii][0], viewArray[ii][1]);

			const attachmentPoint = gl.COLOR_ATTACHMENT0;
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				attachmentPoint,
				gl.TEXTURE_CUBE_MAP_POSITIVE_X + ii,
				this._cubemap,
				level
			);

			gl.viewport(0, 0, targetTextureWidth, targetTextureHeight);
			gl.clearColor(0, 0, 0, 1);
			gl.enable(gl.DEPTH_TEST);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			sphereMesh.render({ viewMatrix, projectionMatrix });
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	makeBuffer() {
		const { normals, positions, uvs } = createSimpleBox(1, 1, 1);

		const gl = this._gl;

		this.positionBuffer = gl.createBuffer();
		this.aPositionLocation = gl.getAttribLocation(this._program.id, 'position');
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

		this.normalBuffer = gl.createBuffer();
		this.aNormalLocation = gl.getAttribLocation(this._program.id, 'normal');
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

		this.uvBuffer = gl.createBuffer();
		this.aUvLocation = gl.getAttribLocation(this._program.id, 'uv');
		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

		this._cnt = positions.length / 3;
	}

	createMatrix() {
		this._modelMatrix = mat4.create();
		this._mvMatrix = mat4.create();
		this._mvpMatrix = mat4.create();

		this._modelInverse = mat4.create();
		this._normalMatrix = mat4.create();
	}

	getUniformLocation() {
		const gl = this._gl;

		this._uTextureLocation = gl.getUniformLocation(this._program.id, 'uTexture');
		this._uViewMatrixLocation = gl.getUniformLocation(this._program.id, 'uViewMatrix');
		this._uProjectionMatrixLocation = gl.getUniformLocation(
			this._program.id,
			'uProjectionMatrix'
		);
	}

	updateModelMatrix() {
		const scale = 10;
		this._modelMatrix = mat4.fromScaling(this._modelMatrix, [scale, scale, scale]);
	}

	/**
	 *
	 * @param {PerspectiveCamera} camera
	 */
	render(camera) {
		const gl = this._gl;

		this._program.use();

		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.FRONT);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.vertexAttribPointer(this.aPositionLocation, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.aPositionLocation);

		gl.uniformMatrix4fv(this._uViewMatrixLocation, false, camera.viewMatrix);
		gl.uniformMatrix4fv(this._uProjectionMatrixLocation, false, camera.projectionMatrix);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, this._cubemap);
		gl.uniform1i(this._uTextureLocation, 0);

		gl.drawArrays(gl.TRIANGLES, 0, this._cnt);
	}
}
