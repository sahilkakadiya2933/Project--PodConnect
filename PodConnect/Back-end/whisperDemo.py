# import googleapiclient.discovery
# from datetime import datetime, timedelta

# # Replace 'YOUR_API_KEY' with your actual YouTube Data API key
# API_KEY = 'AIzaSyCI9TJQhLRrpA6sRAtFhPKMRTZAkceGBlk'

# def get_published_after_date(time_range):
#     """Return the date for the publishedAfter parameter based on the specified time range."""
#     now = datetime.utcnow()
#     if time_range == "today":
#         return now - timedelta(days=1)
#     elif time_range == "this week":
#         return now - timedelta(weeks=1)
#     elif time_range == "last month":
#         return now - timedelta(days=30)
#     elif time_range == "past year":
#         return now - timedelta(days=365)
#     else:
#         raise ValueError("Invalid time range. Choose from 'today', 'this week', 'last month', 'past year'.")

# def get_top_podcast_videos(api_key, region_code='CA', max_results=10, time_range='past year'):
#     youtube = googleapiclient.discovery.build('youtube', 'v3', developerKey=api_key)
    
#     published_after_date = get_published_after_date(time_range).isoformat("T") + "Z"

#     # Search for videos with "podcast" in the title or description, filtering for English language
#     request = youtube.search().list(
#         part='snippet',
#         q='podcast',
#         type='video',
#         regionCode=region_code,
#         maxResults=max_results,
#         order='viewCount',
#         publishedAfter=published_after_date,
#         relevanceLanguage='en'
#     )
    
#     response = request.execute()
    
#     videos = []
#     for item in response['items']:
#         title = item['snippet']['title']
#         video_id = item['id']['videoId']
#         video_url = f'https://www.youtube.com/watch?v={video_id}'
#         published_at = item['snippet']['publishedAt']
#         channel_title = item['snippet']['channelTitle']
#         description = item['snippet']['description']
#         thumbnail_url = item['snippet']['thumbnails']['high']['url']
        
#         # Fetch statistics for each video
#         stats_request = youtube.videos().list(
#             part='statistics',
#             id=video_id
#         )
#         stats_response = stats_request.execute()
#         stats = stats_response['items'][0]['statistics']
#         view_count = stats.get('viewCount', '0')
#         like_count = stats.get('likeCount', '0')
        
#         videos.append({
#             'title': title,
#             'channel': channel_title,
#             'description': description,
#             'url': video_url,
#             'views': view_count,
#             'likes': like_count,
#             'published_at': published_at,
#             'thumbnail': thumbnail_url
#         })
    
#     return videos

# def popularYoutube(api_key, time_range='past year'):
#     top_podcast_videos = get_top_podcast_videos(api_key, time_range=time_range)

#     # Display the top podcast videos
#     print(f"Top English Podcast Videos in Canada for {time_range.replace('_', ' ').title()}:")
#     for idx, video in enumerate(top_podcast_videos, start=1):
#         print(f"{idx}. {video['title']} (Channel: {video['channel']})")
#         print(f"   Link: {video['url']}")
#         print(f"   Views: {video['views']}")
#         print(f"   Likes: {video['likes']}")
#         print(f"   Published At: {video['published_at']}")
#         print(f"   Description: {video['description']}")
#         print(f"   Thumbnail: {video['thumbnail']}\n")

# if __name__ == '__main__':
#     # Example usage: get top podcasts for the past year
#     popularYoutube(API_KEY, time_range='past year')


import requests
from datetime import datetime

# Replace these with your actual client ID and client secret
client_id = '6c4edh0gqek51u0nr5aqh78h6fb9fh'
client_secret = 'vd5vml7jmf5ex9vnygpn1r6e7tzvkg'

def get_access_token(client_id, client_secret):
    url = 'https://id.twitch.tv/oauth2/token'
    params = {
        'client_id': client_id,
        'client_secret': client_secret,
        'grant_type': 'client_credentials'
    }
    
    response = requests.post(url, data=params)
    response.raise_for_status()  # Raises an HTTPError for bad responses (4xx and 5xx)
    
    data = response.json()
    return data['access_token']

def get_top_videos(access_token, client_id, game_id, language, limit=10, sort='views'):
    url = 'https://api.twitch.tv/helix/videos'
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Client-Id': client_id
    }
    params = {
        'game_id': game_id,
        'first': limit,
        'language': language,
        'sort': sort,  # Sort by views
        'period':'month'
    }
    
   
    
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    
    return response.json()

def main():
    # Get access token
    access_token = get_access_token(client_id, client_secret)
    
    # Define the game ID and language
    game_id = 417752  # Example game ID
    language = 'en'  # Example language code
    
    
    # Get top videos from the current year
    top_videos_response = get_top_videos(access_token, client_id, game_id, language)
    
    # Sort the videos by view count in descending order and get the top 10
    top_videos = sorted(top_videos_response['data'], key=lambda x: x['view_count'], reverse=True)[:10]
    
    # Print the top videos
    for video in top_videos:
        print(f"Title: {video['title']}, Views: {video['view_count']}, URL: {video['url']}")

if __name__ == '__main__':
    main()
