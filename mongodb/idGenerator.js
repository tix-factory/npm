// It's kinda like a snowflake but a little less safe because two threads can roll over at the same time... neat

class IdGenerator {
	constructor() {
		this.rollOver = 9999;
		this.inc = this.rollOver;
		this.frontId = this.generateFront();
	}

	generateFront() {
		const currentTime = +new Date;
		return currentTime.toString().substring(0, 10);
	}

	generate() {
		let idBack = ++this.inc;
		if (idBack > this.rollOver) {
			this.inc = 0;
			this.frontId = this.generateFront();
			return this.generate();
		}

		return Number(`${this.frontId}${(`000${idBack}`).slice(-4)}`);
	}
}

export default new IdGenerator();
