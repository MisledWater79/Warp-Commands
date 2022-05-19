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
    }).addInput(input => {
        return input.setRequired(false).setType('string').setName('warptype')
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
            let warpType = group.getInput('warptype').getValue()
            if(warpType == 'global'){
                if(!player.hasTag('staff')){
                    runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cUnknown input: global. Please Check that the input exists and that you have permission to use it."}]}`)
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
            }
            if(globalDB.has(setName) || playerDB.has(setName)){
                runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §c${setName} already exists. Choose a new name or delete the old one."}]}`)
                break;
            }
            let commandResponse = runCommand(`testforblock ${Math.floor(player.location.x)} ${Math.floor(player.location.y)} ${Math.floor(player.location.z)} air`, player.dimension.id)
            if(!commandResponse?.statusMessage){
                runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cInvalid placement for a warp. Please clear the spot where you want the warp to be."}]}`)
                break;
            }
            playerDB.set(setName,{
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
            if(globalDB.has(delName)){
                if(!player.hasTag('staff')){
                    runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cUnknown warp: ${delName}. Please Check that the warp exists and that you have permission to delete it."}]}`)
                    break;
                }
                globalDB.remove(delName)
                runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §9You have §cremoved §9the warp §b${delName}§9!"}]}`)
                break;
            }
            if(!playerDB.has(delName)){
                runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cUnknown warp: ${delName}. Please Check that the warp exists and that you have permission to delete it."}]}`)
                break;
            }
            playerDB.remove(delName)
            runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §9You have §cremoved §9the warp §b${delName}§9!"}]}`)
            break;
        case "warpname":
            let tpName = group.getValue();
            if(globalDB.has(tpName)) {
                let cords = globalDB.getVal(tpName)
                runCommand(`fill ${cords.x} ${cords.y} ${cords.z} ${cords.x} ${cords.y+1} ${cords.z} air`, cords.dimension)
                runCommand(`tp ${player.nameTag} ${cords.x} ${cords.y} ${cords.z}`, cords.dimension)
                runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §9You have §asuccessfully §9warped to §b${tpName}§9!"}]}`)
                break;
            }
            if(playerDB.has(tpName)){
                let cords = playerDB.getVal(tpName)
                runCommand(`fill ${cords.x} ${cords.y} ${cords.z} ${cords.x} ${cords.y+1} ${cords.z} air`, cords.dimension)
                runCommand(`tp ${player.nameTag} ${cords.x} ${cords.y} ${cords.z}`, cords.dimension)
                runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §9You have §asuccessfully §9warped to §b${tpName}§9!"}]}`)
                break;
            }
            runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cUnknown warp: ${tpName}. Please Check that the warp exists."}]}`)
            break;
        case "list":
            runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§9Public Warps:"}]}`)
            globalDB.getData().data.forEach(obj => {
                let message = `§f- §b${obj.key} §f(§9${obj.value.x} ${obj.value.y} ${obj.value.z}§f)`
                message += addDimension(obj.value.dimension)
                runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"${message}"}]}`)
            })
            runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"\n§9Private Warps:"}]}`)
            playerDB.getData().data.forEach(obj => {
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
    let MainForm = new ActionFormData()
    MainForm.title("Warps")
    MainForm.button("Set", 'textures/warpUI/SetWarp')
    MainForm.button("Delete", 'textures/warpUI/CrossWarp')
    MainForm.button("Teleport", 'textures/warpUI/CheckWarp')
    //MainForm.button("Add Player", `textures/warpUI/`)
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
                    let commandResponse = runCommand(`testforblock ${Math.floor(player.location.x)} ${Math.floor(player.location.y)} ${Math.floor(player.location.z)} air`, player.dimension.id)
                    if(!commandResponse?.statusMessage){
                        runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cInvalid placement for a warp. Please clear the spot where you want the warp to be."}]}`)
                        return;
                    }
                    playerDB.set(input,{
                        dimension: player.dimension.id,
                        x: Math.floor(player.location.x),
                        y: Math.floor(player.location.y),
                        z: Math.floor(player.location.z)
                    })
                    let message = ` §9You have made a warp named §b${input} §9at §f(§9${Math.floor(player.location.x)} ${Math.floor(player.location.y)} ${Math.floor(player.location.z)}§f) §9in the`
                    message += addDimension(player.dimension.id)
                    runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"${message}"}]}`)
                })
                break;
            case 1:
                if(playerDB.getData().data.length == 0){
                    runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cYou do not have any warps to delete! Try creating one to delete it."}]}`)
                    break;
                }
                let delForm = new ActionFormData()
                delForm.title("Delete Warp")
                for(const warp of playerDB.getData().data){
                    switch(warp.value.dimension){
                        case "minecraft:overworld":
                            delForm.button(warp.key,'textures/warpUI/Overworld')
                            break;
                        case "minecraft:nether":
                            delForm.button(warp.key,'textures/warpUI/Nether')
                            break;
                        default:
                            delForm.button(warp.key,'textures/warpUI/End')
                            break;
                    }
                }
                delForm.show(player).then((delFormResponse) => {
                    const delSelect = delFormResponse.selection;
                    let confirmForm = new MessageFormData()
                    confirmForm.title(`Delete ${playerDB.getData().data[delSelect].key}`)
                    confirmForm.body(`Are you sure you want to delete ${playerDB.getData().data[delSelect].key}`)
                    confirmForm.button1("Yes")
                    confirmForm.button2("No")
                    confirmForm.show(player).then((confirmFormResponse) => {
                        const { selection } = confirmFormResponse;
                        if(selection == 1){
                            runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §9You have §cremoved §9the warp §b${playerDB.getData().data[delSelect].key}§9!"}]}`)
                            playerDB.remove(playerDB.getData().data[delSelect].key)
                            return;
                        }
                        runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §9Your request to delete a warp has been canceled!"}]}`)
                    })
                })
                break;
            case 2:
                if(globalDB.getData().data.length == 0 && playerDB.getData().data.length == 0){
                    runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §cYou do not have any warps to teleport to! Try creating one to teleport to it."}]}`)
                    break;
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
                for(const warp of playerDB.getData().data){
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
                    runCommand(`fill ${cords.x} ${cords.y} ${cords.z} ${cords.x} ${cords.y+1} ${cords.z} air`, cords.dimension)
                    runCommand(`tp ${player.nameTag} ${cords.x} ${cords.y} ${cords.z}`, cords.dimension)
                    runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":" §9You have §asuccessfully §9warped to §b${warpList[selection].key}§9!"}]}`)
                })
                break;
            case 3:
                let addForm = new ModalFormData();
                break;
        }
    })
}