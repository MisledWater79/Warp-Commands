import { world } from 'mojang-minecraft'

function textToBinary(text) {
	return text.split('').map((char) => {
		return char.charCodeAt(0).toString(2);
	}).join(' ');
}

function runCommand(command, dimension = 'overworld') {
	try {
		return world.getDimension(dimension).runCommand(command)
	} catch (e) {}
}

function binaryToText(binary) {
	return binary.split(' ').map((char) => {
		return String.fromCharCode(parseInt(char, 2));
	}).join('');
}

export default class Database {
  constructor(name){
    try {
			runCommand('scoreboard objectives add database dummy')
			runCommand('scoreboard players set global database 1')
		} catch (e) {}
    try {
      this.name = name;
      this.checkForExisting();
    } catch (e) {
      runCommand(`say setup error: ${e}`)
    }
  }
  checkForExisting(){
    try {
      let database = runCommand(`scoreboard players list`)
		  if (!database?.statusMessage) return
      let regex = database.statusMessage.match(`(?<=\\$${this.name}\\()[0-1\\s]+(?=\\))|(\\$${this.name}\\(\\))`)
	    if(regex) return;
      runCommand(`scoreboard players set "$${this.name}(1111011 100010 1100100 1100001 1110100 1100001 100010 111010 1011011 1011101 1111101)" database -1`)
    } catch (e) {
			runCommand(`say check error: ${e}`)
		}
  }
  getData(){
    try {
      let database = runCommand(`scoreboard players list`)
		  if (!database?.statusMessage) return
      let binary = database.statusMessage.match(`(?<=\\$${this.name}\\()[0-1\\s]+(?=\\))`)[0]
	    if(!binary) return;
      return JSON.parse(binaryToText(binary))
    } catch (e) {
			runCommand(`say getData error: ${e}`)
		}
  }
  updateDatabase(data){
    try {
      let oldData = JSON.stringify(this.getData())
      runCommand(`scoreboard players reset "$${this.name}(${textToBinary(oldData)})"`)
      runCommand(`scoreboard players set "$${this.name}(${textToBinary(JSON.stringify(data))})" database -1`)
    } catch (e) {
			runCommand(`say updateData error: ${e}`)
		}
  }
  updateKey(key,value){
    try {
      let Data = this.getData()
      Data.data.every(obj => {
        if(obj.key == key){
          obj.value = value
          this.updateDatabase(Data)
          return false;
        }
        return true;
      })
    } catch (e) {
			runCommand(`say updateKey error: ${e}`)
		}
  }
  getVal(key){
    try {
      if (!this.has(key)) return
		  let Data = this.getData()
      return Data.data.filter(obj => obj?.key == key)[0].value
    } catch (e) {
			runCommand(`say getVal error: ${e}`)
		}
  }
  has(key){
    try {
      let Data = this.getData()
      let val = Data.data.filter(obj => obj?.key == key)[0]
      if(!val) return false
      return true
    } catch (e) {
			runCommand(`say has error: ${e}`)
		}
  }
  set(key,value){
    try {
			if (this.has(key)) return
			let Data = this.getData()
			Data.data.push({
				key: key,
				value: value
			})
			this.updateDatabase(Data)
		} catch (e) {
			runCommand(`say set error: ${e}`)
		}
  }
  remove(key){
    try {
      if (!this.has(key)) return
      let Data = this.getData()
      Data.data.splice(Data.data.indexOf(Data.data.filter(obj => obj?.key == key)[0]),1)
      this.updateDatabase(Data)
    } catch (e) {
			runCommand(`say remove error: ${e}`)
		}
  }
}