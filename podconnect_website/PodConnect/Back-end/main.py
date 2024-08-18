
from fastapi import FastAPI, UploadFile, Form, Response
from fastapi.responses import FileResponse
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
import srt
import requests
import time, json
import googleapiclient.discovery
from datetime import datetime, timedelta
import isodate
from urllib.parse import quote


UPLOAD_DIR = Path() / 'uploads'
DOWNLOAD_DIR = Path() / 'downloads'
TRANSCRIPTS_DIR = Path() / 'transcripts'
SRT_DIR = Path() / TRANSCRIPTS_DIR / 'SRT'
VTT_DIR = Path() / TRANSCRIPTS_DIR / 'VTT'
TXT_DIR = Path() / TRANSCRIPTS_DIR / 'TXT'
TRANSCRIPTS_DIR.mkdir(exist_ok=True)
TXT_DIR.mkdir(exist_ok=True)
SRT_DIR.mkdir(exist_ok=True)
VTT_DIR.mkdir(exist_ok=True)
DOWNLOAD_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)

TWITCH_CLIENT_ID = '6c4edh0gqek51u0nr5aqh78h6fb9fh'
TWITCH_CLIENT_SECRET = 'vd5vml7jmf5ex9vnygpn1r6e7tzvkg'


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get("/")
async def root():
    return {"message": "Hello World"}





@app.post("/uploadaudio/")
async def createUploadFile(file:UploadFile):
    #read data from the file received through API
    audioData = await file.read();
    audio_url = UPLOAD_DIR / file.filename

    #save the file in server
    with open(audio_url,'wb') as f:
        f.write(audioData)

    return await transcribe_audio(audio_url,bool(False))


@app.post("/directlink/")
async def createUdirectUploadploadFile(link:str=Form(...)):
    return await transcribe_audio(link,bool(True))
###################################################################################

@app.post("/findpodcast/")
async def mySearch(search: str = Form(...), genre: str = Form(...)):
    print(search)
    response = await podcastFind(search, genre)
    return response

###################################################################################

@app.post("/bestpodcasts/")
async def bestPod():
    response = await bestPodcasts()
    return response

###################################################################################

@app.post("/twitchaudio/")
async def twitchAudio(link:str = Form(...)):
    return await transcribe_audio_from_ytdl(link)

###########################################################################################################

@app.post("/ytaudio/")
async def ytAudio(link:str = Form(...)):
    return await transcribe_audio_from_ytdl(link)


@app.get("/download/srt/{transcript_id}")
async def sendSrt(transcript_id: str):
    return await download_file("srt",await getSrt(transcript_id))

@app.get("/download/vtt/{transcript_id}")
async def sendSrt(transcript_id: str):
    return await download_file("vtt",await getVtt(transcript_id))

@app.get("/download/txt/{transcript_id}")
async def sendSrt(transcript_id: str):
    return await download_file("txt",await getTxt(transcript_id))

@app.get("/popularlist/{platform}")
async def sendPopular(platform: str):
    if(platform == "youtube"):
        return  get_top_podcast_yt_videos('AIzaSyCI9TJQhLRrpA6sRAtFhPKMRTZAkceGBlk')
    elif (platform=="twitch"):
        videos = get_twitch_videos()
        max_hours = 2  # Maximum duration limit in hours
        filtered_videos = [video for video in videos if is_duration_within_limit(video['duration'], max_hours)][:10]
        return filtered_videos

#Transcribe audio
async def transcribe_audio(audio_url: str, isDirect:bool):
   # API Key
    api_key = "63227563d59044989dd413bb5c82f4fc"
    print(audio_url)
    # Step 1: Submit the audio file for transcription
    headers = {
        'Authorization': api_key,
        'Content-Type': 'application/json',
    }

    print(Path.cwd())

    if isDirect==bool(False):
        upload_response = requests.post(
            "https://api.assemblyai.com/v2/upload",
            headers={
                "Authorization": api_key,
                "Content-Type": "application/octet-stream"
            },
            data=open(audio_url, 'rb').read(),    
        )
        

        json_data = {
            'audio_url': upload_response.json().get('upload_url')
        }
    else:
        json_data = {
                'audio_url': audio_url
        }

    response = requests.post('https://api.assemblyai.com/v2/transcript', headers=headers, json=json_data)

    # Extract the transcript ID from the response
    response_data = response.json()
    print(response_data)
    transcript_id = response_data.get('id')
    print(f"Transcript ID: {transcript_id}")

    # Step 2: Use the transcript ID to check the status of the transcription
    url = f'https://api.assemblyai.com/v2/transcript/{transcript_id}'

    # Initialize status
    status = 'queued'

    # Wait until the transcription is completed or failed
    while status in ('queued', 'processing'):
        status_response = requests.get(url, headers=headers)
        status_data = status_response.json()
        status = status_data.get('status')
        
        print(f"Transcription status: {status}. Checking again in 10 seconds.")
        if status in ('queued', 'processing'):
            time.sleep(5)

    # Step 3: Handle the final status
    if status == 'completed':
        print("Transcription completed!")
        transcript_srt = await getSrt(transcript_id);
        sub_gen = srt.parse(transcript_srt)

        subtitles = [
            {
                "index": sub.index,
                "start": sub.start.total_seconds(),
                "end": sub.end.total_seconds(),
                "content": sub.content
            }
            for sub in sub_gen
         ]
        print(subtitles)
    elif status == 'failed':
        print("Transcription failed.")
    else:
        print(f"Unexpected status: {status_response.json().get('error')}.")
    return {"transcript_id": transcript_id, "subtitles": subtitles}

async def getSrt(transcript_id: str):
    response = requests.get(
    f"https://api.assemblyai.com/v2/transcript/{transcript_id}/srt?chars_per_caption=75",
    headers={
        "Authorization": "63227563d59044989dd413bb5c82f4fc"
    },
    )

    transcript_content = response.content.decode('utf-8')
            
    # Convert the raw response to a structured format
    segments = transcript_content.split('\n\n')
    formatted_transcript = []

    for segment in segments:
        lines = segment.split('\n')
        if len(lines) >= 3:
            formatted_transcript.append(f"{lines[0]}\n{lines[1]}\n{lines[2]}\n")

    # Join the formatted segments
    final_output = '\n'.join(formatted_transcript)

    return final_output

async def getVtt(transcript_id: str):
    response = requests.get(
    f"https://api.assemblyai.com/v2/transcript/{transcript_id}/vtt?chars_per_caption=75",
    headers={
        "Authorization": "63227563d59044989dd413bb5c82f4fc"
    },
    )

    transcript_content = response.content.decode('utf-8')

    return transcript_content

async def getTxt(transcript_id: str):
    response = requests.get(f"https://api.assemblyai.com/v2/transcript/{transcript_id}",
    headers={
        "Authorization": "63227563d59044989dd413bb5c82f4fc"
    },
    )

    transcript_content = json.loads(response.content)
    transcript_text = transcript_content['text']

    return transcript_text

async def transcribe_audio_from_ytdl(link: str):
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': str(DOWNLOAD_DIR / '%(title)s.%(ext)s'),
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(link, download=False)
            file_path = ydl.prepare_filename(info)

            ydl.process_info(info)
    except Exception as e:
        print('Error downloading audio:', e)
        return {"error": "Failed to download audio"}

    return await transcribe_audio(file_path,bool(False))

async def podcastFind(nameOfPodcast: str, genre_id: str) -> list[dict[str, any]]:
    
    encoded_name = quote(nameOfPodcast) #handling any spaces in search
    encoded_genre_id = quote(genre_id)
    url = 'https://listen-api.listennotes.com/api/v2/search?q={}&sort_by_date=0&genre_ids={}type=podcast&offset=0&len_min=5&published_after=0&only_in=title%2Cdescription%2Cauthor%2Caudio&language=English&safe_mode=0&unique_podcasts=1&interviews_only=0&sponsored_only=0&page_size=10'.format(encoded_name, encoded_genre_id)
    headers = {
        'X-ListenAPI-Key': "3a4aa8379cb74d4c901cd00584180877",
        'Content-Type': 'application/json',
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()  # error for bad responses
    # dumps the json object into an element
    json_str = json.dumps(response.json())
    # load the json to a string
    resp = json.loads(json_str)
    
    search_Results = []
    
    for result in resp["results"]:
        podcast_info = {
            "Podcast Title": result["podcast"]["title_original"],
            "Audio link": result["audio"],
            "Image": result.get("image", ""),
            "Description": result.get("description_original", "No description available")
        }
        
        search_Results.append(podcast_info)
    return search_Results

async def bestPodcasts():
    
     # find the best/ trending podcasts
    url = 'https://listen-api-test.listennotes.com/api/v2/best_podcasts?page=1&region=us%2C%20can&sort=listen_score&safe_mode=0'
    headers = {
        'X-ListenAPI-Key': '3a4aa8379cb74d4c901cd00584180877',
        'Content-Type': 'application/json',
    }
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()  # error for bad responses
    # dumps the json object into an element
    json_str = json.dumps(response.json())
    # load the json to a string
    resp = json.loads(json_str)
    
    search_Results = []
    
    for result in resp["podcasts"]:
        podcast_info = {
            "Podcast Title": result["title"],
            "Audio link": result["listennotes_url"],
            "Image": result.get("image", ""),
            "Description": result.get("description", "No description available")
        }
        
        search_Results.append(podcast_info)
    return search_Results

async def download_file(fileType, contents):
    
    file_content = contents
    if fileType == "srt":
        srtFile = SRT_DIR/"transcript.srt"
        with open(srtFile, "w", encoding="utf-8") as f:
            f.write(file_content)
        return FileResponse(srtFile)
    elif fileType=="vtt" :
        vttFile = VTT_DIR/"transcript.vtt"
        with open(vttFile, "w", encoding="utf-8") as f:
            f.write(file_content)
        return FileResponse(vttFile)
    elif fileType=="txt" :
        txtFile = TXT_DIR / "transcript.txt"
        with open(txtFile, "w", encoding="utf-8") as f:
            f.write(file_content)
        return FileResponse(txtFile)



def get_published_after_date(time_range):
    """Return the date for the publishedAfter parameter based on the specified time range."""
    now = datetime.utcnow()
    if time_range == "today":
        return now - timedelta(days=1)
    elif time_range == "this week":
        return now - timedelta(weeks=1)
    elif time_range == "last month":
        return now - timedelta(days=30)
    elif time_range == "past year":
        return now - timedelta(days=365)
    else:
        raise ValueError("Invalid time range. Choose from 'today', 'this week', 'last month', 'past year'.")

def get_top_podcast_yt_videos(api_key, region_code='CA', max_results=300, time_range='past year'):
    youtube = googleapiclient.discovery.build('youtube', 'v3', developerKey=api_key)
    
    published_after_date = get_published_after_date(time_range).isoformat("T") + "Z"

    # Search for videos with "podcast" in the title or description, filtering for English language
    request = youtube.search().list(
        part='snippet',
        q='podcast',
        type='video',
        regionCode=region_code,
        maxResults=max_results,
        order='viewCount',
        publishedAfter=published_after_date,
        relevanceLanguage='en'
    )
    
    response = request.execute()
    videos = []
    for item in response['items']:
        title = item['snippet']['title']
        video_id = item['id']['videoId']
        video_url = f'https://www.youtube.com/watch?v={video_id}'
        published_at = item['snippet']['publishedAt']
        channel_title = item['snippet']['channelTitle']
        description = item['snippet']['description']
        thumbnail_url = item['snippet']['thumbnails']['high']['url']
        
        # Fetch statistics for each video
        stats_request = youtube.videos().list(
            part='statistics,contentDetails',
            id=video_id
        )
        stats_response = stats_request.execute()
        stats = stats_response['items'][0]['statistics']
        content_details = stats_response['items'][0]['contentDetails']
        view_count = stats.get('viewCount', '0')
        like_count = stats.get('likeCount', '0')
        duration = content_details['duration']
        
        seconds = isodate.parse_duration(duration).total_seconds()

        if seconds >= 200 and len(videos)<10:
            videos.append({
                'title': title,
                'channel': channel_title,
                'description': description,
                'url': video_url,
                'views': view_count,
                'likes': like_count,
                'published_at': published_at,
                'thumbnail': thumbnail_url,
                'duration': duration
            })
    print(videos)
    return videos


def popularYoutube(time_range='past year'):
    top_podcast_videos = get_top_podcast_yt_videos('AIzaSyCI9TJQhLRrpA6sRAtFhPKMRTZAkceGBlk', time_range=time_range)

    # Display the top podcast videos
    print(f"Top English Podcast Videos in Canada for {time_range.replace('_', ' ').title()}:")
    for idx, video in enumerate(top_podcast_videos, start=1):
        print(f"{idx}. {video['title']} (Channel: {video['channel']})")
        print(f"   Link: {video['url']}")
        print(f"   Views: {video['views']}")
        print(f"   Likes: {video['likes']}")
        print(f"   Published At: {video['published_at']}")
        print(f"   Description: {video['description']}")
        print(f"   Thumbnail: {video['thumbnail']}\n")

def get_access_token():
    url = 'https://id.twitch.tv/oauth2/token'
    params = {
        'client_id': TWITCH_CLIENT_ID,
        'client_secret': TWITCH_CLIENT_SECRET,
        'grant_type': 'client_credentials'
    }
    response = requests.post(url, data=params)
    response.raise_for_status()
    return response.json()['access_token']

def get_twitch_videos():
    access_token = get_access_token()
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Client-Id': TWITCH_CLIENT_ID
    }
    params = {
        'game_id': 417752,  # Example game ID for podcasts
        'first': 100,       # Fetch up to 100 videos to increase chances of getting desired length
        'language': 'en',
        'sort': 'views',
        'period':'month'
    }
    response = requests.get('https://api.twitch.tv/helix/videos', headers=headers, params=params)
    response.raise_for_status()
    return response.json()['data']

def is_duration_within_limit(duration, max_hours):
    """Check if the video duration is within the specified max hours limit."""
    hours, minutes, seconds = 0, 0, 0
    if 'h' in duration:
        hours, duration = duration.split('h')
        hours = int(hours)
    if 'm' in duration:
        minutes, duration = duration.split('m')
        minutes = int(minutes)
    if 's' in duration:
        seconds = int(duration.replace('s', ''))
    
    return hours < max_hours or (hours == max_hours and minutes == 0 and seconds == 0)
