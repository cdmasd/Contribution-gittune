export namespace main {
	
	export class Contribution {
	    date: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new Contribution(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.count = source["count"];
	    }
	}

}

