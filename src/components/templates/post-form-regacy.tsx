"use client";

import { createClient } from "@supabase/supabase-js";
import { QueryObserverResult } from "@tanstack/react-query";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { FiImage } from "react-icons/fi";

interface IPostForm {
  title: string;
  content: string;
  image: string | null;
  imageFile: File | null;
  hashtags: string[];
  hashtag: string;
}
/**
 *
 * @returns 게시글 작성 폼
 */
export const PostForm = ({ mutate }: { mutate: () => Promise<QueryObserverResult<any, unknown>> }) => {
  const { data: session, status } = useSession();

  const [postData, setPostData] = useState<IPostForm>({
    title: "",
    content: "",
    image: "" || null,
    imageFile: null,
    hashtag: "",
    hashtags: [],
  });

  useEffect(() => {
    setPostData({ ...postData, hashtag: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postData?.hashtags?.length]);

  const onChangeImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]!;
    const fileReader = new FileReader();
    fileReader?.readAsDataURL(file);
    fileReader.onloadend = (e: any) => {
      const { result } = e?.currentTarget;
      setPostData({ ...postData, image: result, imageFile: file });
    };
  };

  // 게시글 POST
  const onClickPostSubmit = async () => {
    if (status !== "authenticated") return;

    // 파일이 없거나 세션이 유효하지 않으면 종료
    if (!postData.imageFile) return;
    if (!session) {
      window.alert("로그인이 필요합니다.");
      return;
    }
    if (status !== "authenticated") return;

    // 파일 크기 체크
    if (postData.imageFile.size > 1.5 * 1024 * 1024) {
      window.alert("파일 크기는 1.5MB를 초과할 수 없습니다.");
      return;
    }

    // 파일 형식 체크
    if (!["image/jpeg", "image/png", "image/jpg"].includes(postData.imageFile.type)) {
      window.alert("지원하지 않는 파일 형식입니다.");
      return;
    }

    // 파일 이름에서 확장자를 추출
    const fileExtension = postData.imageFile.name.split(".").pop(); // 파일 확장자 추출

    // 유저 ID와 타임값, 랜덤 문자열로 경로 생성
    const timestamp = Date.now(); // 현재 시간
    const randomSuffix = Math.random().toString(36).substring(2, 8); // 랜덤 문자열 생성
    const newFilePath = `${session?.user.id}/${timestamp}_${randomSuffix}.${fileExtension}`; // 경로: userId/타임값_랜덤.확장자

    // Supabase 클라이언트 생성
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    );

    // 새로운 이미지 파일 업로드
    const { error } = await supabaseClient.storage
      .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET as string)
      .upload(newFilePath, postData.imageFile);

    if (error) {
      window.alert("파일 업로드에 실패했습니다.");
      return;
    }

    const requestPath = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_STORAGE_BUCKET}/${newFilePath}`;
    const data = {
      userId: session.user.id,
      email: session.user.email,
      title: postData.title,
      content: postData.content,
      image: requestPath,
      hashtags: postData.hashtags.join(","),
    };

    try {
      const res = await axios.post("/api/post", data);
      setPostData({ title: "", content: "", image: "" || null, imageFile: null, hashtag: "", hashtags: [] });
      console.log(res);
      mutate();
    } catch (error) {
      window.alert("게시글 생성에 실패했습니다.");
    }
  };

  const onChangeInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPostData({ ...postData, [name]: value });
  };

  const onKeyUpHashtag = (e: any) => {
    if (e.key === "Enter" && e.target.value?.trim() !== "") {
      // 만약 같은 태그가 있다면 에러를 띄운다.
      // 아니면 태그를 생성해준다.
      if (postData.hashtags.includes(e.target.value?.trim())) {
        console.error("같은 태그가 있습니다.");
      } else {
        console.log([...postData.hashtags, postData.hashtag?.trim()]);
        setPostData({
          ...postData,
          hashtags:
            postData.hashtags.length > 0
              ? [...postData.hashtags, postData.hashtag?.trim()]
              : [postData.hashtag?.trim()],
        });
      }
    }
  };

  const onClickClearImage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setPostData({ ...postData, image: null, imageFile: null });
  };

  const onClickRemoveHashTag = (tag: string) => {
    setPostData({
      ...postData,
      hashtags: postData.hashtags.filter((hashtag: string) => {
        return hashtag !== tag;
      }),
    });
  };
  // console.log(postData);
  return (
    <div className="flex flex-col gap-6 p-6 max-w-lg mx-auto bg-white rounded-lg shadow-lg">
      {/* 제목 */}
      <div className="flex flex-col">
        <label htmlFor="title" className="text-lg font-semibold text-gray-700">
          제목
        </label>
        <input
          type="text"
          name="title"
          id="title"
          value={postData.title}
          className="mt-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          onChange={onChangeInput}
        />
      </div>

      {/* 내용 */}
      <div className="flex flex-col">
        <label htmlFor="content" className="text-lg font-semibold text-gray-700">
          내용
        </label>
        <input
          type="text"
          name="content"
          id="content"
          value={postData.content}
          className="mt-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          onChange={onChangeInput}
        />
      </div>

      {/* 이미지 첨부 */}
      <div className="flex flex-col items-start">
        <label htmlFor="file-input" className="text-lg font-semibold text-gray-700">
          이미지 첨부
        </label>
        <div className="flex items-center mt-2">
          <label
            htmlFor="file-input"
            className="cursor-pointer p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            <FiImage className="text-gray-600" size={24} />
          </label>
          <input
            type="file"
            name="file-input"
            id="file-input"
            accept="image/*"
            onChange={onChangeImage}
            className="hidden"
          />

          {postData.image && (
            <div className="ml-4 relative">
              <img src={postData.image} alt="attachment" className="w-24 h-24 rounded-lg object-cover shadow-md" />
              <button
                className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-full"
                type="button"
                onClick={onClickClearImage}
              >
                X
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 해시태그 */}
      <div className="flex flex-col">
        <label htmlFor="hashtag" className="text-lg font-semibold text-gray-700">
          해시태그
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {postData?.hashtags.map((hashtag: string, i: number) => (
            <span
              key={i}
              className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full cursor-pointer hover:bg-indigo-200"
              onClick={() => onClickRemoveHashTag(hashtag)}
            >
              #{hashtag}
            </span>
          ))}
        </div>
        <input
          type="text"
          id="hashtag"
          name="hashtag"
          placeholder="해시태그 입력"
          className="mt-2 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          onChange={onChangeInput}
          onKeyUp={onKeyUpHashtag}
          value={postData.hashtag}
        />
      </div>

      {/* 작성 버튼 */}
      <button
        onClick={onClickPostSubmit}
        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
      >
        작성
      </button>
    </div>
  );
};
