import { ModalFormData, ActionFormData, MessageFormData } from "mojang-minecraft-ui";
import { world } from "mojang-minecraft";
import CommandBuilder from "../classes/builders/CommandBuilder.js";
import CommandHandler from "../classes/CommandRegistration.js";
import Database from "../utils/database.js";

const registration = new CommandBuilder()
.setName('warp')
.setAliases(['w'])
.setDescription('Teleport to or set a warp')
.setUsage([
    'set <warpName: string> <warpType: string>',
    'delete <warpName: string>',
    '<warpName: string>',
    'list',
    'form'
])
.setCancelMessage(true)
.setPrivate(false)
.addInput(input => {
    return input.setRequired(true).setType('string').setName('warpname')
})
.addGroup(group => {
    return group.setName('list').setDescription('retrive a list of all warps').setAliases(['l'])
})
.addGroup(group => {
    return group.setName('form').setDescription('open a form for easy use').setAliases(['f'])
})
.addGroup(group => {
    return group.setName('delete').setDescription('delete a val').addInput(input => {
        return input.setRequired(true).setType('string').setName('warpname')
    }).setAliases(['remove','del','r','d'])
})
.addGroup(group => {
    return group.setName('set').setDescription('set a warp').addInput(input => {
        return input.setRequired(true).setType('string').setName('warpname')
    }).setAliases(['s'])
})

CommandHandler.register(registration, (interaction) => {
    const player = interaction.player
    const group = interaction.command.getRanGroup() || interaction.command.getInput('warpname')
    let playerDB = new Database(player.nameTag + 'Warps')
    let globalDB = new Database("globalWarps")
    let tickEvent
    switch(group.getName()){
        case "set":
            let setName = group.getInput('warpname').getValue()
            if(!player.hasTag('5fs:op')){
                runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cUnknown command: delete. Please Check that the command exists and that you have permission to use it."}]}`)
                break;
            }
            if(globalDB.has(setName)){
                runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §c${setName} already exists. Choose a new name or delete the old one."}]}`)
                break;
            }
            globalDB.set(setName,{
                dimension: player.dimension.id,
                x: Math.floor(player.location.x),
                y: Math.floor(player.location.y),
                z: Math.floor(player.location.z)
            })
            let message = ` §9You have made a warp named §b${setName} §9at §f(§9${Math.floor(player.location.x)} ${Math.floor(player.location.y)} ${Math.floor(player.location.z)}§f) §9in the`
            message += addDimension(player.dimension.id)
            runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"${message}"}]}`)
            break;
        case "delete":
            let delName = group.getInput('warpname').getValue()
            if(!player.hasTag('5fs:op')){
                runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cUnknown command: delete. Please Check that the command exists and that you have permission to use it."}]}`)
                break;
            }
            if(globalDB.has(delName)){
                globalDB.remove(delName)
                runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §9You have §cremoved §9the warp §b${delName}§9!"}]}`)
                break;
            }
            runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cUnknown warp: ${delName}. Please Check that the warp exists and that you have permission to delete it."}]}`)
            break;
        case "warpname":
            let tpName = group.getValue();
            if(globalDB.has(tpName)) {
                let scores = globalDB.getVal(tpName).scores
                if(scores){
                    let command = 'scoreboard players list @a[scores={'
                    scores.forEach((score) => {
                        command += `${score.name}=${score.value}..,`
                    })
                    command = command.slice(0,command.length-1)
                    command += '}]'
                    let playerList = runCommand(command)
                    if(playerList?.statusMessage.indexOf(player.nameTag) == -1){
                        runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cUnknown warp: ${tpName}. Please Check that the warp exists."}]}`)
                        break;
                    }
                }
                let cords = globalDB.getVal(tpName)
                runCommand(`tp ${player.nameTag} ${cords.x} ${cords.y} ${cords.z}`, cords.dimension)
                runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §9You have §asuccessfully §9warped to §b${tpName}§9!"}]}`)
                break;
            }
            runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cUnknown warp: ${tpName}. Please Check that the warp exists."}]}`)
            break;
        case "list":
            runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§9Warps:"}]}`)
            globalDB.getData().data.forEach(obj => {
                let message = `§f- §b${obj.key} §f(§9${obj.value.x} ${obj.value.y} ${obj.value.z}§f)`
                message += addDimension(obj.value.dimension)
                runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"${message}"}]}`)
            })
            break;
        case "form":
            try {
                world.events.tick.unsubscribe(tickEvent)
            } catch(e){}
            runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§aExit chat and move to open up the menu!"}]}`)
            tickEvent = world.events.tick.subscribe(e => {
                if (player.velocity.x > 0 || player.velocity.y > 0 || player.velocity.z > 0){
                    world.events.tick.unsubscribe(tickEvent)
                    openUi(player,globalDB,playerDB)
                }
            })
            break;
    }
})

function addDimension(dimension){
    switch(dimension){
        case "minecraft:overworld":
            return " §f(§aOverworld§f)";
        case "minecraft:nether":
            return " §f(§cNether§f)";
        default:
            return " §f(§dEnd§f)";
    }
}

function runCommand(command, dimension = 'overworld') {
	try {
		return world.getDimension(dimension).runCommand(command)
	} catch (e) {}
}

function openUi(player,globalDB,playerDB){
    if(!player.hasTag('5fs:op')){
        if(globalDB.getData().data.length == 0){
            runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cYou do not have any warps to teleport to! Try creating one to teleport to it."}]}`)
            return;
        }
        let tpForm = new ActionFormData()
        let warpList = []
        tpForm.title("Teleport to Warp")
        for(const warp of globalDB.getData().data){
            warpList.push(warp)
            switch(warp.value.dimension){
                case "minecraft:overworld":
                    tpForm.button(warp.key,'textures/warpUI/Overworld')
                    break;
                case "minecraft:nether":
                    tpForm.button(warp.key,'textures/warpUI/Nether')
                    break;
                default:
                    tpForm.button(warp.key,'textures/warpUI/End')
                    break;
            }
        }
        tpForm.show(player).then((tpFormResponse) => {
            const { selection } = tpFormResponse;
            let cords = warpList[selection].value
            runCommand(`tp ${player.nameTag} ${cords.x} ${cords.y} ${cords.z}`, cords.dimension)
            runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §9You have §asuccessfully §9warped to §b${warpList[selection].key}§9!"}]}`)
        })
        return;
    }
    let MainForm = new ActionFormData()
    MainForm.title("Warps")
    MainForm.button("Set", 'textures/warpUI/SetWarp')
    MainForm.button("Teleport", 'textures/warpUI/CheckWarp')
    MainForm.show(player).then((MainFormResponse) => {
        const { selection } = MainFormResponse;
        switch(selection){
            case 0:
                let setForm = new ModalFormData()
                setForm.title("Set Warp")
                setForm.textField("Warp Name:", "Warp Name")
                setForm.show(player).then((setFormResponse) => {
                    const { formValues } = setFormResponse;
                    let [ input ] = formValues;
                    if(globalDB.has(input) || playerDB.has(input)){
                        runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §c${setName} already exists. Choose a new name or delete the old one."}]}`)
                        return;
                    }
                    let scoreList = []
                    let value = true
                    while(value){
                        let scoreForm = new MessageFormData()
                        scoreForm.title("Add Score?")
                        scoreForm.body("Would you like to add a scoreboard and value to this warp?")
                        scoreForm.button1("Yes")
                        scoreForm.button2("No")
                        scoreForm.show(player).then((scoreFormResponse) => {
                            let { selection } = scoreFormResponse
                            switch(selection){
                                case 0://No
                                    value = false
                                    break;
                                case 1://Yes
                                    let addScoreForm = new ModalFormData()
                                    addScoreForm.title("Add Score")
                                    addScoreForm.textField("Scoreboard",'')
                                    addScoreForm.slider("Must be greater than or equal to:",0,100,10)
                                    addScoreForm.show(player).then((addScoreFormResponse) => {
                                        let [ input, slider ] = addScoreFormResponse.formValues
                                        scoreList.push({
                                            name: input,
                                            value: slider
                                        })
                                    })
                                    break;
                            }
                        })
                    }
                    globalDB.set(input,{
                        dimension: player.dimension.id,
                        x: Math.floor(player.location.x),
                        y: Math.floor(player.location.y),
                        z: Math.floor(player.location.z),
                        scores: scoreList
                    })
                    let message = ` §9You have made a warp named §b${input} §9at §f(§9${Math.floor(player.location.x)} ${Math.floor(player.location.y)} ${Math.floor(player.location.z)}§f) §9in the`
                    message += addDimension(player.dimension.id)
                    runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"${message}"}]}`)
                })
                break;
            case 1:
                if(globalDB.getData().data.length == 0){
                    runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cYou do not have any warps to teleport to! Try creating one to teleport to it."}]}`)
                    return;
                }
                let tpForm = new ActionFormData()
                let warpList = []
                tpForm.title("Teleport to Warp")
                for(const warp of globalDB.getData().data){
                    warpList.push(warp)
                    switch(warp.value.dimension){
                        case "minecraft:overworld":
                            tpForm.button(warp.key,'textures/warpUI/Overworld')
                            break;
                        case "minecraft:nether":
                            tpForm.button(warp.key,'textures/warpUI/Nether')
                            break;
                        default:
                            tpForm.button(warp.key,'textures/warpUI/End')
                            break;
                    }
                }
                tpForm.show(player).then((tpFormResponse) => {
                    const { selection } = tpFormResponse;
                    let cords = warpList[selection].value
                    runCommand(`tp ${player.nameTag} ${cords.x} ${cords.y} ${cords.z}`, cords.dimension)
                    runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §9You have §asuccessfully §9warped to §b${warpList[selection].key}§9!"}]}`)
                })
                break;
        }
    })
}