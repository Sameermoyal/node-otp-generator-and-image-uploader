//bismillah 
const express =require('express')
const mongoose =require('mongoose')
const bcrypt =require('bcrypt')
const jwt=require('jsonwebtoken')
const fileUpload =require('express-fileupload')
const cloudinary =require('cloudinary')

const app=express();
const port =3000;
const secret_key='yubuyb hbhj bhjbjh'
const userSchema = mongoose.Schema(
    {
        name:{type:String,required:true},
        email:{type:String,required:true,unique:true},
        password:{type:String,required:true},
        otp:{type:String,default:null},
    }
)

cloudinary.config({
    cloud_name: 'dqfhn7rw3',
    api_key: '382695276612379', 
    api_secret:'3XWIpGNiRSe2K2Cs2t9-fUtPPY0', 
  });

app.use(express.json())
app.use(express.urlencoded())
app.use(fileUpload({
    useTempFiles:true
}))
const userModel =mongoose.model('user',userSchema);
mongoose.connect('mongodb://localhost:27017/test').then(()=>{console.log("mongodb connected")}).catch((error)=>{console.log("error to  connection in mongodb",error)})

app.post('/signup',async(req,res)=>{
   try{
    const {name,email,password}=req.body;

    if(!name || !email || !password){
        return res.status(400).json({message:"'all fields are required!'"})
    }

    const existingUser =await userModel.findOne({email})
    if(existingUser){
        return res.status(400).json({message:"'you already registerd'"})
    }

    const salt=bcrypt.genSaltSync(10)
    const hashPassword=bcrypt.hashSync(password,salt)
    

    const userData ={name,email,password:hashPassword}
    const newUser =  new userModel(userData)
    await newUser.save()

    return res.status(200).json({message:"'user successfully created'",newUser})
   }catch(err){
    return res.status(500).json({message:"'server error '",err})
   }
}) 


app.post('/login',async(req,res)=>{
   try{
    const {email,password}=req.body;
   
    const existingUser =await userModel.findOne({email})
    if(! existingUser){
        return res.status(400).json({message:"'you  not  registerd, please signup'"})
    }
    const dbPassword =existingUser.password;
    const match=await bcrypt.compare(password,dbPassword)
    
    if(! match){
        return res.status(400).json({message:"'password is wrong'"})
    }

    const otp =Math.floor(Math.random()*1000000).toString()
    existingUser.otp=otp;
    await existingUser.save()

    const token =jwt.sign({id:existingUser._id},secret_key,{expiresIn:'1m'})

    return res.status(200).json({message:"'user successfully login'",token})
   }catch(err){
    return res.status(500).json({message:"'server error '",err})
   }
})  
app.post('/verify',async(req,res)=>{
   try{
    const {email,otp}=req.body;
   if(!email || !otp){
    return res.status(400).json({message:"'both email and otp  fields required'"})
   }

    const existingUser =await userModel.findOne({email})
    if(! existingUser){
        return res.status(400).json({message:"'user not found'"})
    }
    const dbPassword =existingUser.otp;
    
    if(!otp==existingUser.otp){
        return res.status(400).json({message:"'your otp is invalid'"})
    }
   
    existingUser.otp=null 
    await existingUser.save()
    

    const token =jwt.sign({id:existingUser._id},secret_key,{expiresIn:'1m'})

    return res.status(200).json({message:"'user successfully verify'",token})
   }catch(err){
    return res.status(500).json({message:"'server error '",err})
   }
})  

app.listen(port,()=>{console.log("server run this port ",port)})


app.post('/upload',async(req,res)=>{
    try{
        console.log(req.files)
        if(!req.files || !req.files.image){
            return res.status(400).json({message:"'image is not uploaded '"})
        }

        const file=req.files.image;
        const result =await cloudinary.uploader.upload(file.tempFilePath)
        return res.status(200).json({message:"'file upload successfully '",imageurl:result.secure_url})

    }catch(error){
        return res.status(500).json({message:"'server error '",error})
    }
})
