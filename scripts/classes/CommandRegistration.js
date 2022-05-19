import { world } from 'mojang-minecraft'
import Collection from './include/Collection.js';
import player from '../utils/player.js'
import event from './manager/EventEmitter.js'
import CommandError from './error/command.js';
import Interaction from './interaction/interaction.js';
import CommandParser from './parser/command.js'
import MS from '../utils/ms.js'
import { setTickTimeout } from '../utils/scheduling.js';
import Database from '../utils/database.js';

class CustomCommand {
    constructor() {
        this.prefix = "-";
        //this.cooldowns = new Database('commandCooldowns');
        this.commands = new Collection();
        world.events.beforeChat.subscribe(beforeChatPacket => {
            this.exec(beforeChatPacket)
        })
    };
    
    getCommand(command) {
        const cmd = command?.toLowerCase();
        return this.commands.get(cmd) || this.commands.find(v => v.aliases?.includes(cmd));
    };
    
    getAllCommands() {
        return this.commands
    }
    
    getPrefix() {
        return this.prefix
    }
    
    setPrefix(value) {
        this.prefix = value
    }
    
    register(registration, callback) {
        this.commands.set(registration.name.toLowerCase(), {
            ...registration,
            callback
        });
    };
    
    triggerCommand(command, interaction) {
        this.getCommand(command).callBack(interaction)
    }
    
    
    exec(beforeChatPacket) {
        try {
        let { message, sender } = beforeChatPacket
        if (!message.startsWith(this.prefix))
            return;
        
        beforeChatPacket.cancel = true
        const args = message.slice(this.prefix.length).trim().match(/([^\s"]+|"[^"]*")+/g)?.map(v => /\s/.test(v) ? v.replace(/^"|"$/g, '') : v);
        
        const commandName = args?.shift()?.toLowerCase();
        const command = this.getCommand(commandName);
        if (!command || command.private && !player.hasTag({ tag: 'private', name: sender.nameTag }))
            return new CommandError({ message: `§cUnknown command: ${commandName}. Please check that the command exists and that you have permission to use it.`, player: sender.nameTag, });
        if(command.requiredTags.length && !player.hasAllTags({ tags: command.requiredTags, name: sender.nameTag }))
            return new CommandError({ message: `§cYou do not have the required permissions to use ${commandName}. You must have all of the required tags to execute this command.`, player: sender.nameTag, })
        
        beforeChatPacket.cancel = command.cancelMessage
        
        let ParsedCommand;
        try {
            ParsedCommand = new CommandParser({ command, args }).toParsedCommand()
        }  catch(e) {
            new CommandError({ message: e.message, player: sender.nameTag })
            return;
        }
        /*
        if(!this.cooldowns.has(command.name)) this.cooldowns.set(command.name, []);
        const now = new Date().getTime();
        let timestamps = this.cooldowns.getVal(command.name)
        const cooldownAmount = MS(command.cooldown || '0');
        
        let timestamp = timestamps.find(elm => elm?.player == sender.nameTag)
        const expirationTime = timestamp ? timestamp?.cooldown + cooldownAmount : 0
        if(now < expirationTime) 
          return new CommandError({ message: `§cPlease wait ${MS(expirationTime - now)} before reusing this command.`, player: sender.nameTag });

        !!timestamp ? timestamps[timestamps.indexOf(timestamp)] = { ...timestamp, cooldown: now } : timestamps.push({ player: sender.nameTag, cooldown: now })
        
        this.cooldowns.updateKey(command.name, timestamps)*/
            
        const interaction = new Interaction(ParsedCommand, sender, message, args)
        event.emit('commandRan', interaction)
        
        command.callback(interaction);
        } catch(e) {
            console.warn(`say ${e} ${e.stack}, \nplease report error!`)
        }
    };
};

const CommandHandler = new CustomCommand()
export default CommandHandler 
